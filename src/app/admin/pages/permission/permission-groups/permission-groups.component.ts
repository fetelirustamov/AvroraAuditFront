import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { queryString } from '../../../../shared/utils/query-state';
import { RoleService } from '../../../services/role.service';
import { RoleDto } from '../../../models/role.model';
import { TableUrlState } from '../../../shared/table-url-state';

@Component({
  selector: 'app-permission-groups',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    PageHeaderComponent,
    ListStateComponent
  ],
  templateUrl: './permission-groups.component.html',
  styleUrl: './permission-groups.component.scss'
})
export class PermissionGroupsComponent implements OnInit, AfterViewInit {
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly roleService = inject(RoleService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['name', 'description', 'actions'];
  readonly dataSource = new MatTableDataSource<RoleDto>([]);
  readonly urlState = new TableUrlState(inject(Router), this.route);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, 'q') ?? '', { nonNullable: true });

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  ngOnInit(): void {
    this.dataSource.filter = this.searchControl.value.trim().toLowerCase();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.dataSource.filter = value.trim().toLowerCase();
        this.paginator.firstPage();
        this.urlState.writeFilters({ q: value.trim() });
      });
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;
    this.roleService.getAllRoles()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: res => {
          this.dataSource.data = Array.isArray(res?.data) ? res.data : [];
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'İcazə qrupları yüklənmədi')
      });
  }

  remove(row: RoleDto): void {
    this.confirmDialog.confirm({
      title: 'İcazə qrupu silinsin?',
      message: 'Qrup və onun səhifə icazələri siyahıdan çıxacaq, admin panelindən geri qaytarmaq olmur. '
        + 'İstifadəçilərə təyin olunmuş və ya sistem qrupu silinmir: server buna icazə vermir.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [row.name]
    }).subscribe(result => {
      if (!result) return;
      this.roleService.deleteRole(row.id).subscribe({
        next: () => {
          this.notify.success('İcazə qrupu silindi');
          this.load();
        },
        // 409: sistem qrupu və ya istifadəçilərə təyin olunmuş qrup - səbəb serverin mesajındadır
        error: err => this.notify.error(apiErrorMessage(err, 'İcazə qrupu silinmədi'))
      });
    });
  }
}

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
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, finalize } from 'rxjs';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { queryString } from '../../../../shared/utils/query-state';
import { UserService } from '../../../services/user.service';
import { UserDetail } from '../../../models/user.model';
import { TableUrlState } from '../../../shared/table-url-state';
import { UserCreateComponent, UserCreateResult } from '../user-create/user-create.component';

interface UserRow {
  /** UserCode (sicil nömrəsi): redaktə və passiv etmə bununla işləyir. */
  userCode: number;
  fullName: string;
  /** E-poçt həm də giriş ünvanıdır. */
  email: string;
  firms: string[];
  roleName: string;
  active: boolean;
  /** Sıralama üçün: aktivlər əvvəl. */
  status: number;
}

function toRow(dto: UserDetail): UserRow {
  const userCode = dto.userCode ?? dto.id;
  const nameParts = [dto.name, dto.surName, dto.fatherName].filter(Boolean);
  return {
    userCode,
    fullName: nameParts.length ? nameParts.join(' ') : `Kod ${userCode}`,
    email: dto.email ?? '',
    firms: dto.firms?.map(f => f.firmName) ?? [],
    roleName: dto.roleName ?? '',
    active: dto.status === 1,
    status: dto.status === 1 ? 1 : 0
  };
}

/**
 * İstifadəçilər: siyahı, yaratma (dialoq: şəxsi məlumatlar + firmalar + icazə qrupu) və passiv etmə.
 * Redaktə ayrıca səhifədir: `user-permission/:userCode`.
 * Passiv istifadəçilər və firması/qrupu olmayanlar da siyahıdadır: admin onları tapıb düzəldə bilsin.
 */
@Component({
  selector: 'app-user-permission',
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
  templateUrl: './user-permission.component.html',
  styleUrl: './user-permission.component.scss'
})
export class UserPermissionComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['userCode', 'fullName', 'firms', 'roleName', 'status', 'actions'];
  readonly dataSource = new MatTableDataSource<UserRow>([]);
  readonly urlState = new TableUrlState(this.router, this.route);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, 'q') ?? '', { nonNullable: true });

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  constructor() {
    // Axtarış koda, ada, e-poçta, firmalara və qrupa baxır
    this.dataSource.filterPredicate = (row, filter) =>
      [String(row.userCode), row.fullName, row.email, row.roleName, ...row.firms]
        .some(value => value.toLocaleLowerCase('az').includes(filter));
  }

  ngOnInit(): void {
    this.applySearch();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.applySearch();
        this.paginator.firstPage();
        this.urlState.writeFilters({ q: value.trim() });
      });
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private applySearch(): void {
    this.dataSource.filter = this.searchControl.value.trim().toLocaleLowerCase('az');
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;
    this.userService.getUserDetails()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          this.dataSource.data = (Array.isArray(response?.data) ? response.data : []).map(toRow);
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'İstifadəçilər yüklənmədi')
      });
  }

  addNewUser(): void {
    this.dialog.open<UserCreateComponent, void, UserCreateResult>(UserCreateComponent, {
      width: '760px',
      maxWidth: '95vw',
      disableClose: true
    }).afterClosed().subscribe(result => {
      if (!result) return;
      this.load();
      // Firma və qrup təyinatı alınmayıbsa admin redaktə səhifəsində tamamlayır
      if (!result.assigned) {
        this.router.navigate(['/admin/permissions/user-permission', result.userCode]);
      }
    });
  }

  deactivate(user: UserRow): void {
    this.confirmDialog.confirm({
      title: 'İstifadəçi passiv edilsin?',
      message: 'İstifadəçi sistemə və mobil tətbiqə daxil ola bilməyəcək. Yoxlamaları, planları və təsdiq zəncirindəki yeri qalır. '
        + 'Geri qaytarmaq olar: redaktə səhifəsində statusu yenidən aktiv edin.',
      confirmText: 'Passiv et',
      tone: 'danger',
      items: [`${user.userCode} · ${user.fullName}`]
    }).subscribe(result => {
      if (!result) return;
      this.userService.deleteUser(user.userCode).subscribe({
        next: () => {
          this.notify.success('İstifadəçi passiv edildi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'İstifadəçi passiv edilmədi'))
      });
    });
  }
}

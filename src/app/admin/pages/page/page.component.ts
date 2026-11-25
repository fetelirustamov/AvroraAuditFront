import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, finalize } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryString } from '../../../shared/utils/query-state';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageService } from '../../services/page.service';
import { PageDto } from '../../models/page.model';
import { TableUrlState } from '../../shared/table-url-state';
import { PageFormDialogComponent, PageFormDialogData } from './page-form-dialog.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss'
})
export class PageComponent implements OnInit, AfterViewInit {
  private readonly pageService = inject(PageService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['name', 'key', 'status', 'actions'];
  readonly dataSource = new MatTableDataSource<PageDto>([]);
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
    this.pageService.list()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: pages => {
          this.dataSource.data = pages;
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Səhifələr yüklənmədi')
      });
  }

  add(): void {
    this.openDialog({});
  }

  edit(row: PageDto): void {
    this.openDialog({ item: row });
  }

  private openDialog(data: PageFormDialogData): void {
    this.dialog.open<PageFormDialogComponent, PageFormDialogData, boolean>(PageFormDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(row: PageDto): void {
    this.confirmDialog.confirm({
      title: 'Səhifə silinsin?',
      message: 'Səhifə icazə qruplarının siyahısından çıxacaq və bu açara icazəsi olan hər kəsin menyusundan itəcək. '
        + 'Admin panelindən geri qaytarmaq olmur.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [`${row.name} · ${row.key}`]
    }).subscribe(result => {
      if (!result) return;
      this.pageService.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Səhifə silindi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'Səhifə silinmədi'))
      });
    });
  }
}

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
import { FirmAddComponent, FirmDialogData } from './add/firm-add.component';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryString } from '../../../shared/utils/query-state';
import { TableUrlState } from '../../shared/table-url-state';

@Component({
  selector: 'app-firms',
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
  templateUrl: './firms.component.html',
  styleUrl: './firms.component.scss'
})
export class FirmsComponent implements OnInit, AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly firmService = inject(FirmService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['name', 'description', 'address', 'phone', 'email', 'actions'];
  readonly dataSource = new MatTableDataSource<FirmDto>([]);
  readonly urlState = new TableUrlState(inject(Router), this.route);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, 'q') ?? '', { nonNullable: true });

  isLoading = false;
  /** İlk cavab gəlib: boş siyahı mesajı yalnız bundan sonra göstərilir. */
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
    this.firmService.getAllFirms()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          this.dataSource.data = Array.isArray(response?.data) ? response.data : [];
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Firmalar yüklənmədi')
      });
  }

  add(): void {
    this.openDialog({});
  }

  edit(row: FirmDto): void {
    this.openDialog({ item: row });
  }

  private openDialog(data: FirmDialogData): void {
    this.dialog.open<FirmAddComponent, FirmDialogData, boolean>(FirmAddComponent, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      data
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(row: FirmDto): void {
    this.confirmDialog.confirm({
      title: 'Firma silinsin?',
      message: 'Firma bütün siyahılardan və seçimlərdən çıxır, bu geri qaytarılmır. '
        + 'Firmanın keçmiş planları və hesabatları qalır. Firmaya aktiv mağaza, şöbə və ya istifadəçi bağlıdırsa, server silməyə icazə vermir.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [row.name]
    }).subscribe(result => {
      if (!result) return;
      this.firmService.deleteFirm(row.id).subscribe({
        next: () => {
          this.notify.success('Firma silindi');
          this.load();
        },
        // 409: firmaya bağlı aktiv mağaza, şöbə və ya istifadəçi var - səbəb serverin mesajındadır
        error: err => this.notify.error(apiErrorMessage(err, 'Firma silinmədi'))
      });
    });
  }
}

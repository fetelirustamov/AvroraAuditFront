import { AfterViewInit, Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
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
import { SectionAddComponent, SectionDialogData } from './add/section-add.component';
import { SectionDto } from '../../models/section.model';
import { SectionService } from '../../services/section.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryString } from '../../../shared/utils/query-state';
import { TableUrlState } from '../../shared/table-url-state';
import { MASTER_DATA_QUERY } from '../master-data/master-data-query';

const KEYS = MASTER_DATA_QUERY.sections;

/** "Audit strukturu" səhifəsinin "Şöbələr" tabı: seçilmiş firmanın şöbələri. */
@Component({
  selector: 'app-sections',
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
    ListStateComponent
  ],
  templateUrl: './sections.component.html',
  styleUrl: './sections.component.scss'
})
export class SectionsComponent implements OnInit, OnChanges, AfterViewInit {
  private readonly sectionService = inject(SectionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) firmId!: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['sectionName', 'sectionDescription', 'actions'];
  readonly dataSource = new MatTableDataSource<SectionDto>([]);
  readonly urlState = new TableUrlState(inject(Router), this.route, KEYS.page);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, KEYS.search) ?? '', { nonNullable: true });

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  constructor() {
    this.dataSource.filterPredicate = (row, filter) => row.sectionName.toLocaleLowerCase('az').includes(filter);
  }

  ngOnInit(): void {
    this.applySearch();
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.applySearch();
        this.paginator.firstPage();
        this.urlState.writeFilters({ [KEYS.search]: value.trim() });
      });
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Firma dəyişəndə filtrlər sıfırlanır (URL-i səhifə özü təmizləyir).
    // Səhifə hadisəsiz sıfırlanır: paginator-un page hadisəsi səhifənin firma naviqasiyasını əvəz edərdi.
    if (changes['firmId'] && !changes['firmId'].firstChange) {
      this.searchControl.setValue('', { emitEvent: false });
      this.paginator.pageIndex = 0;
      this.applySearch();
      this.loaded = false;
      this.dataSource.data = [];
      this.load();
    }
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
    this.sectionService.getByFirmId(this.firmId)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          // Firmanın şöbəsi yoxdursa API 204 qaytarır: gövdə boşdur
          this.dataSource.data = Array.isArray(response?.data) ? response.data : [];
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Şöbələr yüklənmədi')
      });
  }

  add(): void {
    this.openDialog({ firmId: this.firmId });
  }

  edit(row: SectionDto): void {
    this.openDialog({ firmId: row.firmId, item: row });
  }

  private openDialog(data: SectionDialogData): void {
    this.dialog.open<SectionAddComponent, SectionDialogData, boolean>(SectionAddComponent, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      data
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(row: SectionDto): void {
    this.confirmDialog.confirm({
      title: 'Şöbə silinsin?',
      message: 'Şöbə firmanın siyahılarından çıxacaq. İçindəki kateqoriyalar və suallar ayrıca silinmir, '
        + 'keçmiş yoxlama nəticələri dəyişmir. Admin panelindən geri qaytarmaq olmur.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [row.sectionName]
    }).subscribe(result => {
      if (!result) return;
      this.sectionService.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Şöbə silindi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'Şöbə silinmədi'))
      });
    });
  }
}

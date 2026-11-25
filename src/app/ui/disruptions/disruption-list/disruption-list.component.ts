import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { disruptionStatusLabel } from '../../../shared/status/status-meta';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryDate, queryNumber, toQueryDate, writeQueryState } from '../../../shared/utils/query-state';
import { setFilter } from '../../../shared/utils/table-filter';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { Location } from '../../inspections/location.model';
import { TableService } from '../../services/table.service';
import { BACK_PARAM } from '../disruption-nav';

/** `disruptions/plans` sətri: uyğunsuzluğu olan yekunlaşmış plan */
interface DisruptionPlanRow {
  inspectionPlanId: number;
  inspectorName: string;
  locationCode: number | string;
  locationName: string;
  createdDate: string;
}

const DEFAULT_STATUS = 2;
const PAGE_SIZES = [10, 20, 50];

// Yekun statuslu (təsdiqlənmiş / rədd edilmiş) uyğunsuzluqların planları. Onay işi "Müfəttiş təsdiqi"-ndədir.
@Component({
  selector: 'app-disruption-list',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, AppDatePipe,
  ],
  templateUrl: './disruption-list.component.html',
  styleUrl: './disruption-list.component.scss'
})
export class DisruptionListComponent implements OnInit {
  private readonly inspectionsService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['position', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'details'];
  readonly statusOptions = [DEFAULT_STATUS, -1].map(value => ({ value, label: disruptionStatusLabel(value) }));
  readonly pageSizeOptions = PAGE_SIZES;

  readonly filtersForm = new FormGroup({
    firmId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    locationCode: new FormControl<number | null>(null),
    status: new FormControl<number>(DEFAULT_STATUS, { nonNullable: true }),
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
  });

  firms: Firm[] = [];
  locations: Location[] = [];

  rows: DisruptionPlanRow[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];

  searched = false;
  isLoading = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();

  ngOnInit(): void {
    this.tableService.api_url = 'disruptions/plans';
    this.tableState.sorting.direction = 'desc';
    this.loadFirms();

    // Filtr URL-dədir: geri qayıdanda və ya link paylaşılanda siyahı bərpa olunur
    const q = this.route.snapshot.queryParamMap;
    const firmId = queryNumber(q, 'firm');
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];
    if (firmId == null) return;

    this.filtersForm.patchValue({
      firmId,
      locationCode: queryNumber(q, 'location'),
      status: queryNumber(q, 'status') ?? DEFAULT_STATUS,
      dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
    });
    this.loadLocations(firmId);
    this.applyFilter();
    this.fill();
  }

  private loadFirms(): void {
    this.inspectionsService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.firms = response.data ?? [],
      error: error => this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi'))
    });
  }

  private loadLocations(firmId: number): void {
    this.inspectionsService.getLocationByFirmId(firmId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.locations = response.data ?? [],
      error: error => this.notify.error(apiErrorMessage(error, 'Mağazalar yüklənmədi'))
    });
  }

  onSelectFirm(firmId: number): void {
    this.filtersForm.controls.locationCode.setValue(null);
    this.locations = [];
    this.loadLocations(firmId);
  }

  onSearch(): void {
    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      this.notify.warning('Firma seçin');
      return;
    }
    const v = this.filtersForm.getRawValue();
    this.pageIndex = 0;
    void writeQueryState(this.router, {
      firm: v.firmId,
      location: v.locationCode,
      status: v.status === DEFAULT_STATUS ? null : v.status,
      from: v.dateRange.start,
      to: v.dateRange.end,
      page: null,
    });
    this.applyFilter();
    this.fill();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
    this.fill();
  }

  private applyFilter(): void {
    const v = this.filtersForm.getRawValue();
    const filter = this.tableState.filter;
    setFilter(filter, 'firmId', v.firmId);
    setFilter(filter, 'locationCode', v.locationCode);
    setFilter(filter, 'disruptionStatus', v.status);
    setFilter(filter, 'startDate', v.dateRange.start ? toQueryDate(v.dateRange.start) : null);
    setFilter(filter, 'endDate', v.dateRange.end ? toQueryDate(v.dateRange.end) : null);
  }

  fill(): void {
    this.searched = true;
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableState.paginator.size = this.pageSize;
    this.tableService.fill(this.tableState).pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => {
        // TableService xətanı udur və `success: false` qaytarır
        if (response.success === false) {
          this.loadError = response.message || 'Uyğunsuzluqlar yüklənmədi';
          return;
        }
        this.rows = (response.data?.items ?? []) as unknown as DisruptionPlanRow[];
        this.total = response.data?.total ?? 0;
      },
      error: error => this.loadError = apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'),
    });
  }

  rowNumber(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  detailParams(row: DisruptionPlanRow): Record<string, string | number> {
    return {
      plan: row.inspectionPlanId,
      // Axtarışda tətbiq olunmuş status (formda dəyişib axtarılmayan yox)
      status: this.tableState.filter['disruptionStatus'] ?? DEFAULT_STATUS,
      [BACK_PARAM]: this.router.url,
    };
  }
}

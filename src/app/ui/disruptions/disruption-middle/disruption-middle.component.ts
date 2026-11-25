import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { AuthService } from '../../../auth/auth.service';
import { TableState } from '../../../models/table-state.model';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryDate, queryNumber, toQueryDate, writeQueryState } from '../../../shared/utils/query-state';
import { setFilter } from '../../../shared/utils/table-filter';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { Location } from '../../inspections/location.model';
import { TableService } from '../../services/table.service';
import { BACK_PARAM } from '../disruption-nav';
import { daysSince } from '../disruption-tracking/disruption-tracking.model';

/** `disruptions/plans` sətri: təsdiq gözləyən uyğunsuzluğu olan plan */
interface DisruptionPlanRow {
  inspectionPlanId: number;
  inspectorName: string;
  locationCode: number | string;
  locationName: string;
  createdDate: string;
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-disruption-middle',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, AppDatePipe,
  ],
  templateUrl: './disruption-middle.component.html',
  styleUrl: './disruption-middle.component.scss'
})
export class DisruptionMiddleComponent implements OnInit {
  private readonly inspectionsService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['position', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'details'];
  readonly pageSize = PAGE_SIZE;

  readonly filtersForm = new FormGroup({
    // Firma ixtiyaridir: server sorğunu istifadəçinin öz firmalarına salır (FirmScope)
    firmId: new FormControl<number | null>(null),
    locationCode: new FormControl<number | null>(null),
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

  hasLoaded = false;
  isLoading = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();

  ngOnInit(): void {
    // Admin/HeadInspector bütün müfəttişlərin həm müfəttiş təsdiqi gözləyən (0), həm də baş müfəttiş
    // təsdiqi gözləyən (1) uyğunsuzluqlarını görür; müfəttiş yalnız özünün 0-larını
    const isHeadInspector = this.authService.hasAnyRole(['HeadInspector', 'Admin']);
    const userId = this.authService.getUserInfo()?.Id;
    this.tableService.api_url = 'disruptions/plans';
    this.tableState.sorting.direction = 'desc';
    this.tableState.paginator.size = PAGE_SIZE;
    this.tableState.filter['inspectionPlanStatus'] = '4';
    this.tableState.filter['disruptionStatus'] = isHeadInspector ? '0,1' : '0';
    if (!isHeadInspector && userId) {
      this.tableState.filter['inspector'] = String(userId);
    }

    this.loadFirms();

    // Səhifə açılan kimi istifadəçinin öz növbəsi yüklənir; filtrlər URL-dən bərpa olunur
    const q = this.route.snapshot.queryParamMap;
    const firmId = queryNumber(q, 'firm');
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.filtersForm.patchValue({
      firmId,
      locationCode: firmId != null ? queryNumber(q, 'location') : null,
      dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
    });
    this.syncLocationControl(firmId);
    if (firmId != null) this.loadLocations(firmId);
    this.applyFilter();
    this.fill();
  }

  /** Mağaza siyahısı firmadan asılıdır: firma seçilməyəndə sahə bağlıdır */
  private syncLocationControl(firmId: number | null): void {
    const control = this.filtersForm.controls.locationCode;
    if (firmId != null) control.enable({ emitEvent: false }); else control.disable({ emitEvent: false });
  }

  get hasActiveFilters(): boolean {
    const v = this.filtersForm.getRawValue();
    return v.firmId != null || v.locationCode != null || v.dateRange.start != null || v.dateRange.end != null;
  }

  clearFilters(): void {
    this.filtersForm.reset({ firmId: null, locationCode: null, dateRange: { start: null, end: null } });
    this.locations = [];
    this.syncLocationControl(null);
    this.onSearch();
  }

  /** Yoxlamadan bəri keçən gün: növbədə nə qədər gözlədiyini göstərir */
  waitingLabel(row: DisruptionPlanRow): string | null {
    const days = daysSince(row.createdDate);
    if (days == null || days < 0) return null;
    return days === 0 ? 'Bu gün' : `${days} gündür gözləyir`;
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

  onSelectFirm(firmId: number | null): void {
    this.filtersForm.controls.locationCode.setValue(null);
    this.locations = [];
    this.syncLocationControl(firmId);
    if (firmId != null) this.loadLocations(firmId);
  }

  onSearch(): void {
    const v = this.filtersForm.getRawValue();
    this.pageIndex = 0;
    void writeQueryState(this.router, {
      firm: v.firmId,
      location: v.locationCode,
      from: v.dateRange.start,
      to: v.dateRange.end,
      page: null,
    });
    this.applyFilter();
    this.fill();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    void writeQueryState(this.router, { page: e.pageIndex || null });
    this.fill();
  }

  private applyFilter(): void {
    const v = this.filtersForm.getRawValue();
    const filter = this.tableState.filter;
    setFilter(filter, 'firmId', v.firmId);
    setFilter(filter, 'locationCode', v.locationCode);
    setFilter(filter, 'startDate', v.dateRange.start ? toQueryDate(v.dateRange.start) : null);
    setFilter(filter, 'endDate', v.dateRange.end ? toQueryDate(v.dateRange.end) : null);
  }

  fill(): void {
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableService.fill(this.tableState).pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => {
        // TableService xətanı udur və `success: false` qaytarır
        if (response.success === false) {
          this.loadError = response.message || 'Planlar yüklənmədi';
          return;
        }
        this.rows = (response.data?.items ?? []) as unknown as DisruptionPlanRow[];
        this.total = response.data?.total ?? 0;
        this.hasLoaded = true;
      },
      error: error => this.loadError = apiErrorMessage(error, 'Planlar yüklənmədi'),
    });
  }

  rowNumber(index: number): number {
    return this.pageIndex * PAGE_SIZE + index + 1;
  }

  detailParams(row: DisruptionPlanRow): Record<string, string | number> {
    return { plan: row.inspectionPlanId, [BACK_PARAM]: this.router.url };
  }
}

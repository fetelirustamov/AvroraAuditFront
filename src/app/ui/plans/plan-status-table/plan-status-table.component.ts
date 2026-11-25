import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, finalize } from 'rxjs';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { PlanApprove } from '../plan.model';
import { PlanService } from '../plan.service';
import { planStoreLabel } from '../plan-row';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { statusActionConfirm } from '../../../shared/status/status-actions';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { setFilter } from '../../../shared/utils/table-filter';
import { queryDate, queryNumber, queryString, writeQueryState } from '../../../shared/utils/query-state';
import { PlanStatusPage, PlanTransition, statusOptionLabel } from './plan-status-page';

const PAGE_SIZES = [10, 25, 50];
/** Serverin sıralama açarları (`InspectionPlanRepository.GetDetails`); default ID-dir */
const SORTABLE = ['locationCode', 'locationName', 'startTime', 'endTime'];

/**
 * Plan statusunu dəyişən siyahı: Əməliyyatlar, Yoxlanılmış, Yoxlama təsdiqi.
 * Fərqlər route-un `data.statusPage`-indədir (`plan-status-page.ts`): status süzgəci, keçidlər, mətnlər.
 *
 * Firma ixtiyaridir: server sorğunu istifadəçinin öz firmalarına salır (Admin hamısını görür),
 * ona görə səhifə açılan kimi növbə yüklənir.
 */
@Component({
  selector: 'app-plan-status-table',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatSortModule, MatCheckboxModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe,
  ],
  providers: [DatePipe, TableService],
  templateUrl: './plan-status-table.component.html',
  styleUrl: './plan-status-table.component.scss'
})
export class PlanStatusTableComponent implements OnInit {
  private readonly inspectionService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly planService = inject(PlanService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly datePipe = inject(DatePipe);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly page: PlanStatusPage = this.route.snapshot.data['statusPage'];
  readonly pageSizes = PAGE_SIZES;
  readonly storeLabel = planStoreLabel;
  readonly statusLabel = statusOptionLabel;

  readonly form = new FormGroup({
    firmId: new FormControl<number | null>(null),
    status: new FormControl<number>(this.page.statuses[0], { nonNullable: true }),
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
  });

  firms: Firm[] = [];
  rows: InspectionPlan[] = [];
  readonly selection = new SelectionModel<InspectionPlan>(true, []);
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];
  sortActive = '';
  sortDirection: SortDirection = '';
  /** Son axtarışın firması: seçilməyibsə cədvəldə firma sütunu görünür */
  appliedFirmId: number | null = null;
  hasLoaded = false;
  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'inspectionPlans/getDetails';
    this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());
  }

  ngOnInit(): void {
    this.inspectionService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => (this.firms = response.data ?? []),
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firma siyahısı yüklənmədi')),
    });

    const q = this.route.snapshot.queryParamMap;
    const status = queryNumber(q, 'status');
    this.form.patchValue({
      firmId: queryNumber(q, 'firm'),
      status: status != null && this.page.statuses.includes(status) ? status : this.page.statuses[0],
      dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
    });
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];
    const sort = queryString(q, 'sort');
    if (sort && SORTABLE.includes(sort)) {
      this.sortActive = sort;
      this.sortDirection = queryString(q, 'dir') === 'desc' ? 'desc' : 'asc';
    }

    this.applyFilters();
    this.load();
  }

  get hasStatusFilter(): boolean {
    return this.page.statuses.length > 1;
  }

  get showFirmColumn(): boolean {
    return this.appliedFirmId == null && this.firms.length !== 1;
  }

  get displayedColumns(): string[] {
    return [
      ...(this.transitions.length ? ['select'] : []),
      ...(this.showFirmColumn ? ['firmName'] : []),
      'locationCode', 'locationName', 'inspectorsName', 'startDate', 'endDate', 'status', 'action',
    ];
  }

  /** Cari siyahıda ən azı bir sətrə tətbiq olunan keçidlər (toplu düymələr) */
  get transitions(): readonly PlanTransition[] {
    return this.page.transitions.filter(t => this.rows.some(row => t.from.includes(row.status)));
  }

  rowTransitions(row: InspectionPlan): readonly PlanTransition[] {
    return this.page.transitions.filter(t => t.from.includes(row.status));
  }

  /** Toplu əməliyyat yalnız seçilmiş sətirlərin hamısına uyğun olanda aktivdir */
  canApplyToSelection(transition: PlanTransition): boolean {
    return this.selection.hasValue() && this.selection.selected.every(row => transition.from.includes(row.status));
  }

  isAllSelected(): boolean {
    return this.rows.length > 0 && this.selection.selected.length === this.rows.length;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.rows);
    }
  }

  checkboxLabel(row?: InspectionPlan): string {
    if (!row) {
      return this.isAllSelected() ? 'Bütün seçimləri götür' : 'Hamısını seç';
    }
    return `${this.selection.isSelected(row) ? 'Seçimi götür' : 'Sətri seç'}: ${planStoreLabel(row)}`;
  }

  onSearch(): void {
    this.pageIndex = 0;
    const { firmId, status, dateRange } = this.form.getRawValue();
    void writeQueryState(this.router, {
      firm: firmId,
      status: this.hasStatusFilter && status !== this.page.statuses[0] ? status : null,
      from: dateRange.start,
      to: dateRange.end,
      page: null,
    });
    this.applyFilters();
    this.load();
  }

  clearFilters(): void {
    this.form.reset({ firmId: null, status: this.page.statuses[0], dateRange: { start: null, end: null } });
    this.onSearch();
  }

  get hasActiveFilters(): boolean {
    const { firmId, status, dateRange } = this.form.getRawValue();
    return firmId != null || status !== this.page.statuses[0] || dateRange.start != null || dateRange.end != null;
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    void writeQueryState(this.router, {
      page: event.pageIndex || null,
      size: event.pageSize === PAGE_SIZES[0] ? null : event.pageSize,
    });
    this.load();
  }

  onSort(sort: Sort): void {
    this.sortActive = sort.direction ? sort.active : '';
    this.sortDirection = sort.direction;
    this.pageIndex = 0;
    void writeQueryState(this.router, { sort: this.sortActive || null, dir: this.sortActive ? sort.direction : null, page: null });
    this.load();
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableState.paginator.size = this.pageSize;
    // Sıralama seçilməyibsə ən yeni plan üstdədir
    this.tableState.sorting.column = this.sortActive || 'id';
    this.tableState.sorting.direction = this.sortActive ? this.sortDirection : 'desc';

    this.loadSub = this.tableService.fill(this.tableState)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(response => {
        if (!response.success) {
          this.loadError = response.message;
          return;
        }
        const items = response.data?.items ?? [];
        // Son sətrin statusu dəyişibsə boş qalan səhifədən bir əvvəlkinə keç
        if (items.length === 0 && this.pageIndex > 0) {
          this.pageIndex--;
          void writeQueryState(this.router, { page: this.pageIndex || null });
          this.load();
          return;
        }
        this.hasLoaded = true;
        this.rows = items;
        this.total = response.data?.total ?? 0;
        // Toplu əməliyyat yalnız ekranda görünən sətirlərə tətbiq olunsun
        this.selection.clear();
      });
  }

  /** Detal səhifəsi ID-ni URL-dən alır; geri linki siyahının filtrli URL-inə qayıdır */
  openDetails(row: InspectionPlan): void {
    void this.router.navigate(['/inspections/details'], { queryParams: { id: row.id, returnUrl: this.router.url } });
  }

  apply(transition: PlanTransition, rows: InspectionPlan[]): void {
    if (rows.length === 0) return;
    // Bir sətirdə səbəbsiz təsdiq dərhal gedir; toplu əməliyyat və səbəb tələb edən keçid soruşulur
    if (rows.length === 1 && !transition.action.confirm && !transition.action.requiresReason) {
      this.submit(transition, rows);
      return;
    }
    this.confirmDialog.confirm(statusActionConfirm(transition.action, rows.length, rows.map(planStoreLabel)))
      .subscribe(result => {
        if (result) this.submit(transition, rows, result.reason);
      });
  }

  private submit(transition: PlanTransition, rows: InspectionPlan[], reason?: string): void {
    if (this.isSaving) return;
    const items = rows.map(row => ({ planId: row.id, status: transition.to, reason }) as PlanApprove);

    this.isSaving = true;
    this.planService.aprovePlan(items)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          // Server dəyişən qeyd sayını qaytarır: keçidə uyğun olmayan qeyd dəyişmir
          const changed = Number(data?.data ?? 0);
          if (!data?.success || changed === 0) {
            this.notify.error(data?.message || 'Status dəyişmədi');
          } else if (changed < rows.length) {
            this.notify.warning(`${rows.length} qeyddən ${changed}-nin statusu dəyişdi`,
              { message: 'Qalanların statusu artıq başqa mərhələdədir. Siyahı yeniləndi.' });
          } else {
            this.notify.success(transition.success[rows.length > 1 ? 1 : 0]);
          }
          this.load();
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi')),
      });
  }

  /** Formdakı dəyərləri sorğu filtrinə yazır; səhifələmə son axtarışın filtri ilə gedir */
  private applyFilters(): void {
    const { firmId, status, dateRange } = this.form.getRawValue();
    this.appliedFirmId = firmId;
    setFilter(this.tableState.filter, 'firmId', firmId);
    setFilter(this.tableState.filter, 'status', status);
    setFilter(this.tableState.filter, 'startDate', this.datePipe.transform(dateRange.start, 'yyyy-MM-dd'));
    setFilter(this.tableState.filter, 'endDate', this.datePipe.transform(dateRange.end, 'yyyy-MM-dd'));
  }
}

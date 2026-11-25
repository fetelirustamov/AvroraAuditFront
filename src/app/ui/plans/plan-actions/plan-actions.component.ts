import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
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
import { PLAN_STATUS_LABELS } from '../../../shared/status/status-meta';
import { STATUS_ACTIONS, StatusAction, statusActionConfirm } from '../../../shared/status/status-actions';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { setFilter } from '../../../shared/utils/table-filter';
import { queryDate, queryNumber, writeQueryState } from '../../../shared/utils/query-state';

/** `InspectionPlans.Status`: təsdiq 1→2 (və səhv rədd edilmiş planın bərpası -1→2), rədd 1|2→-1. */
const PENDING = 1;
const APPROVED = 2;
const REJECTED = -1;

const PAGE_SIZES = [10, 25, 50];

@Component({
  selector: 'app-plan-actions',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatCheckboxModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe,
  ],
  providers: [DatePipe, TableService],
  templateUrl: './plan-actions.component.html',
  styleUrl: './plan-actions.component.scss'
})
export class PlanActionsComponent implements OnInit, OnDestroy {
  private readonly inspectionService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly planService = inject(PlanService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly datePipe = inject(DatePipe);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly displayedColumns = ['select', 'inspectorsName', 'locationCode', 'locationName', 'startDate', 'endDate', 'status', 'action'];
  readonly pageSizes = PAGE_SIZES;
  readonly statusOptions = [PENDING, APPROVED, REJECTED].map(value => ({ value, label: PLAN_STATUS_LABELS[value] }));

  readonly approveAction = STATUS_ACTIONS.approve;
  readonly rejectAction = STATUS_ACTIONS.reject;

  readonly form = new FormGroup({
    firmId: new FormControl<number | null>(null, Validators.required),
    status: new FormControl<number | null>(null, Validators.required),
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
  /** Son axtarışın statusu: toplu düymələr buna görə göstərilir. */
  appliedStatus: number | null = null;
  searched = false;
  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'inspectionPlans/getDetails';
    this.tableState.sorting.direction = 'desc';
  }

  ngOnInit(): void {
    this.getFirms();

    const q = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      firmId: queryNumber(q, 'firm'),
      status: queryNumber(q, 'status'),
      dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
    });
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];

    if (this.form.valid) {
      this.applyFilters();
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  readonly storeLabel = planStoreLabel;

  get canApproveSelected(): boolean {
    return this.appliedStatus === PENDING || this.appliedStatus === REJECTED;
  }

  get canRejectSelected(): boolean {
    return this.appliedStatus === PENDING || this.appliedStatus === APPROVED;
  }

  /** Gözləyən və səhv rədd edilmiş plan təsdiqlənə bilər. */
  canApprove(row: InspectionPlan): boolean {
    return row.status === PENDING || row.status === REJECTED;
  }

  canReject(row: InspectionPlan): boolean {
    return row.status === PENDING || row.status === APPROVED;
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Firmanı və statusu seçin.' });
      return;
    }
    this.pageIndex = 0;
    const { firmId, status, dateRange } = this.form.getRawValue();
    writeQueryState(this.router, {
      firm: firmId, status, from: dateRange.start, to: dateRange.end, page: null,
    });
    this.applyFilters();
    this.load();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    writeQueryState(this.router, { page: event.pageIndex || null, size: event.pageSize });
    this.load();
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableState.paginator.size = this.pageSize;

    this.loadSub = this.tableService.fill(this.tableState)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.loadError = response.message;
            return;
          }
          const items = response.data?.items ?? [];
          // Son sətrin statusu dəyişibsə boş qalan səhifədən bir əvvəlkinə keç
          if (items.length === 0 && this.pageIndex > 0) {
            this.pageIndex--;
            writeQueryState(this.router, { page: this.pageIndex || null });
            this.load();
            return;
          }
          this.searched = true;
          this.rows = items;
          this.total = response.data?.total ?? 0;
          // Toplu əməliyyat yalnız ekranda görünən sətirlərə tətbiq olunsun
          this.selection.clear();
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Planlar yüklənmədi')),
      });
  }

  approve(row: InspectionPlan): void {
    this.submit([row], APPROVED);
  }

  reject(row: InspectionPlan): void {
    this.confirmThenSubmit(this.rejectAction, [row], REJECTED);
  }

  approveSelected(): void {
    this.confirmThenSubmit(this.approveAction, this.selection.selected, APPROVED);
  }

  rejectSelected(): void {
    this.confirmThenSubmit(this.rejectAction, this.selection.selected, REJECTED);
  }

  private confirmThenSubmit(action: StatusAction, rows: InspectionPlan[], status: number): void {
    if (rows.length === 0) return;
    this.confirmDialog.confirm(statusActionConfirm(action, rows.length, rows.map(planStoreLabel)))
      .subscribe(result => {
        if (result) this.submit(rows, status, result.reason);
      });
  }

  private submit(rows: InspectionPlan[], status: number, reason?: string): void {
    if (this.isSaving) return;
    const items = rows.map(row => ({ planId: row.id, status, reason }) as PlanApprove);
    const many = items.length > 1;
    const successMessage = status === APPROVED
      ? (many ? 'Planlar təsdiqləndi' : 'Plan təsdiqləndi')
      : (many ? 'Planlar rədd edildi' : 'Plan rədd edildi');

    this.isSaving = true;
    this.planService.aprovePlan(items)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.notify.success(successMessage);
          } else {
            this.notify.error(data.message || 'Status dəyişmədi');
          }
          this.load();
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi')),
      });
  }

  private getFirms(): void {
    this.inspectionService.getFirms().subscribe({
      next: (response) => (this.firms = response.data ?? []),
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firma siyahısı yüklənmədi')),
    });
  }

  /** Formdakı dəyərləri sorğu filtrinə yazır; səhifələmə son axtarışın filtri ilə gedir. */
  private applyFilters(): void {
    const { firmId, status, dateRange } = this.form.getRawValue();
    this.appliedStatus = status;
    setFilter(this.tableState.filter, 'firmId', firmId);
    setFilter(this.tableState.filter, 'status', status);
    setFilter(this.tableState.filter, 'startDate', this.datePipe.transform(dateRange.start, 'yyyy-MM-dd'));
    setFilter(this.tableState.filter, 'endDate', this.datePipe.transform(dateRange.end, 'yyyy-MM-dd'));
  }
}

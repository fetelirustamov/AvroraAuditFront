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
import { InspectionPlan } from '../InpectionPlan.model';
import { Firm } from '../firm.model';
import { InspectionsService } from '../inspections.service';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { PlanApprove } from '../../plans/plan.model';
import { PlanService } from '../../plans/plan.service';
import { planStoreLabel } from '../../plans/plan-row';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { STATUS_ACTIONS, StatusAction, statusActionConfirm } from '../../../shared/status/status-actions';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { setFilter } from '../../../shared/utils/table-filter';
import { queryDate, queryNumber, writeQueryState } from '../../../shared/utils/query-state';

/** `InspectionPlans.Status`: 3 = yoxlama təsdiq gözləyir; təsdiq 3→4, mobilə qaytarma 3→2. */
const AWAITING_APPROVAL = 3;
const APPROVED = 4;
const RETURNED_TO_MOBILE = 2;

const PAGE_SIZES = [10, 25, 50];

@Component({
  selector: 'app-inspection-approve',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatCheckboxModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, AppDatePipe,
  ],
  providers: [DatePipe, TableService],
  templateUrl: './inspection-approve.component.html',
  styleUrl: './inspection-approve.component.scss'
})
export class InspectionApproveComponent implements OnInit, OnDestroy {
  private readonly inspectionService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly planService = inject(PlanService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly datePipe = inject(DatePipe);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly displayedColumns = ['select', 'inspectorsName', 'locationCode', 'locationName', 'startDate', 'endDate', 'action'];
  readonly pageSizes = PAGE_SIZES;
  readonly approveAction = STATUS_ACTIONS.approve;
  readonly returnAction = STATUS_ACTIONS.returnToMobile;
  readonly storeLabel = planStoreLabel;

  readonly form = new FormGroup({
    firmId: new FormControl<number | null>(null, Validators.required),
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
  searched = false;
  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'inspectionPlans/getDetails';
    this.tableState.filter['status'] = String(AWAITING_APPROVAL);
    this.tableState.sorting.direction = 'desc';
  }

  ngOnInit(): void {
    this.getFirms();

    // Detal səhifəsindən qayıdanda filtr və səhifə URL-dən bərpa olunur, data yenidən çəkilir
    const q = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      firmId: queryNumber(q, 'firm'),
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
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Firmanı seçin.' });
      return;
    }
    this.pageIndex = 0;
    const { firmId, dateRange } = this.form.getRawValue();
    writeQueryState(this.router, { firm: firmId, from: dateRange.start, to: dateRange.end, page: null });
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
          // Son sətir təsdiqlənib/qaytarılıbsa boş qalan səhifədən bir əvvəlkinə keç
          if (items.length === 0 && this.pageIndex > 0) {
            this.pageIndex--;
            writeQueryState(this.router, { page: this.pageIndex || null });
            this.load();
            return;
          }
          this.searched = true;
          this.rows = items;
          this.total = response.data?.total ?? 0;
          this.selection.clear();
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Yoxlamalar yüklənmədi')),
      });
  }

  /** Detal səhifəsi ID-ni URL-dən alır; geri linki siyahının filtrli URL-inə qayıdır. */
  openDetails(row: InspectionPlan): void {
    this.router.navigate(['/inspections/details'], { queryParams: { id: row.id, returnUrl: this.router.url } });
  }

  approve(row: InspectionPlan): void {
    this.submit([row], APPROVED);
  }

  approveSelected(): void {
    this.confirmThenSubmit(this.approveAction, this.selection.selected, APPROVED);
  }

  returnToMobile(rows: InspectionPlan[]): void {
    this.confirmThenSubmit(this.returnAction, rows, RETURNED_TO_MOBILE);
  }

  private confirmThenSubmit(action: StatusAction, rows: InspectionPlan[], status: number): void {
    if (rows.length === 0) return;
    this.confirmDialog.confirm(statusActionConfirm(action, rows.length, rows.map(planStoreLabel)))
      .subscribe(result => {
        if (result) this.submit(rows, status);
      });
  }

  private submit(rows: InspectionPlan[], status: number): void {
    if (this.isSaving) return;
    const items = rows.map(row => ({ planId: row.id, status }) as PlanApprove);

    this.isSaving = true;
    this.planService.aprovePlan(items)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            // Bildiriş düymədəki feli təkrarlayır
            this.notify.success(status === APPROVED ? 'Yoxlama təsdiqləndi' : 'Yoxlama mobilə qaytarıldı');
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

  private applyFilters(): void {
    const { firmId, dateRange } = this.form.getRawValue();
    setFilter(this.tableState.filter, 'firmId', firmId);
    setFilter(this.tableState.filter, 'startDate', this.datePipe.transform(dateRange.start, 'yyyy-MM-dd'));
    setFilter(this.tableState.filter, 'endDate', this.datePipe.transform(dateRange.end, 'yyyy-MM-dd'));
  }
}

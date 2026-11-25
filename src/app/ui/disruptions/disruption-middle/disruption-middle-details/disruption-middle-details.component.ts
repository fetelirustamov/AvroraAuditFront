import { SelectionModel } from '@angular/cdk/collections';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { TableState } from '../../../../models/table-state.model';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { STATUS_ACTIONS, StatusAction, statusActionConfirm } from '../../../../shared/status/status-actions';
import { StatusChipComponent } from '../../../../shared/status/status-chip.component';
import { StatusChange, StatusReasonComponent } from '../../../../shared/status/status-reason.component';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../../../shared/utils/query-state';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { MediaComponent } from '../../../components/media/media.component';
import { TableService } from '../../../services/table.service';
import { backLinkFromQuery } from '../../disruption-nav';
import { DisruptionApproveDto, DisruptionDto } from '../../disruption.model';
import { DISRUPTION_STATUS, approverFromAuth, nextApproveStatus } from '../../disruption-approval';
import { DisruptionService } from '../../disruption.service';
import { DisruptionEditDialogComponent } from './disruption-edit-dialog.component';

const PAGE_SIZES = [10, 20, 50];

const STATUS_REJECTED = DISRUPTION_STATUS.REJECTED;
const STATUS_INSPECTOR = DISRUPTION_STATUS.INSPECTOR;

/**
 * Planın təsdiq gözləyən uyğunsuzluqları. Plan URL-dədir (`?plan=…`).
 * Rol ayrılığı frontdadır: müfəttiş 0→1, baş müfəttiş 0/1→2, Admin hər iki addımı ayrıca verir.
 */
@Component({
  selector: 'app-disruption-middle-details',
  standalone: true,
  imports: [
    StatusReasonComponent,
    MatTableModule, MatPaginatorModule, MatCheckboxModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe, MediaComponent,
  ],
  templateUrl: './disruption-middle-details.component.html',
  styleUrl: './disruption-middle-details.component.scss',
})
export class DisruptionMiddleDetailsComponent implements OnInit {
  private readonly tableService = inject(TableService);
  private readonly disruptionService = inject(DisruptionService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly MediaType = MediaType;
  readonly Module = Module;
  readonly pageSizeOptions = PAGE_SIZES;

  readonly approveAction = STATUS_ACTIONS.approve;
  readonly rejectAction = STATUS_ACTIONS.reject;
  readonly returnAction = STATUS_ACTIONS.returnToInspector;

  /** HeadInspector və Admin: 0 və 1-ləri görür, müfəttişə qaytara bilir */
  readonly isHeadInspector = this.authService.hasAnyRole(['HeadInspector', 'Admin']);
  readonly isAdmin = this.authService.hasRole('Admin');
  /** Redaktə Inspector və Admin üçün */
  readonly canEdit = this.authService.hasAnyRole(['Inspector', 'Admin']);

  readonly displayedColumns = [
    'select', 'inspectorName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description',
    ...(this.isHeadInspector ? ['status'] : []),
    'media', 'action',
  ];

  readonly backLink: UrlTree = backLinkFromQuery(this.router, this.route, '/disruptions/middle');

  planId: number | null = null;
  rows: DisruptionDto[] = [];
  /** disruptionId → son rədd / müfəttişə qaytarma səbəbi (səbəbsizlər yoxdur). */
  reasons = new Map<number, StatusChange>();
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];
  readonly selection = new SelectionModel<DisruptionDto>(true, []);

  store: { code: number | string; name: string } | null = null;

  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.planId = queryNumber(q, 'plan');
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];

    if (this.planId == null) {
      this.loadError = 'Plan seçilməyib. Siyahıya qayıdıb planı yenidən açın.';
      return;
    }

    this.tableService.api_url = 'disruptions/getDetails';
    this.tableState.sorting.direction = 'desc';
    this.tableState.filter['inspectionPlanStatus'] = '4';
    this.tableState.filter['disruptionStatus'] = this.isHeadInspector ? '0,1' : '0';
    this.tableState.filter['inspectionPlanId'] = String(this.planId);
    this.fill();
  }

  get title(): string {
    if (!this.store) return this.planId != null ? `Plan №${this.planId}` : 'Müfəttiş təsdiqi';
    return `${this.store.name} · ${this.store.code}`;
  }

  get subtitle(): string {
    return this.store && this.planId != null ? `Plan №${this.planId} · təsdiq gözləyən uyğunsuzluqlar` : '';
  }

  // ── Cədvəl ──────────────────────────────────────────────────────────────

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
    this.fill();
  }

  fill(): void {
    if (this.planId == null) return;
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
        this.rows = response.data?.items ?? [];
        this.total = response.data?.total ?? 0;
        this.selection.clear();
        this.loadReasons();
        const first = this.rows[0];
        if (first) this.store = { code: first.locationCode, name: first.locationName };
      },
      error: error => this.loadError = apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'),
    });
  }

  /** Səhifədəki sətirlərin səbəbləri bir sorğu ilə gəlir. Müfəttiş qaytarılanın niyəsini burada görür. */
  private loadReasons(): void {
    this.reasons = new Map();
    const ids = this.rows.map(r => r.disruptionId);
    if (!ids.length) return;
    this.disruptionService.getStatusReasons(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => (this.reasons = new Map((response.data ?? []).map(c => [c.refId, c]))),
        // Səbəb əlavə məlumatdır: alınmasa cədvəl onsuz göstərilir
        error: () => (this.reasons = new Map()),
      });
  }

  isAllSelected(): boolean {
    return this.rows.length > 0 && this.selection.selected.length === this.rows.length;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.rows);
  }

  checkboxLabel(row?: DisruptionDto): string {
    if (!row) return this.isAllSelected() ? 'Bütün seçimləri götür' : 'Hamısını seç';
    return `${this.selection.isSelected(row) ? 'Seçimi götür' : 'Sətri seç'}: ${this.itemLabel(row)}`;
  }

  /** Dialoqda və etiketlərdə qeydin adı: "Mağaza – səbəb" */
  private itemLabel(row: DisruptionDto): string {
    return `${row.locationName} – ${row.reasonName || row.sectionName}`;
  }

  // ── Status əməliyyatları ────────────────────────────────────────────────

  private readonly approver = approverFromAuth(this.authService);

  /** Rol qaydası `disruption-approval.ts`-dədir: izləmə paneli də onu işlədir */
  approveStatus(row: DisruptionDto): number {
    return nextApproveStatus(Number(row.status), this.approver);
  }

  approve(rows: DisruptionDto[]): void {
    // Seçilmiş sətirlərin statusu qarışıq ola bilər: hər sətir öz növbəti təsdiq statusunu alır
    this.submitStatuses(rows, row => this.approveStatus(row), 'Uyğunsuzluq təsdiqləndi');
  }

  reject(rows: DisruptionDto[]): void {
    this.confirmThen(this.rejectAction, rows, reason =>
      this.submitStatuses(rows, () => STATUS_REJECTED, 'Uyğunsuzluq rədd edildi', reason));
  }

  returnToInspector(rows: DisruptionDto[]): void {
    this.confirmThen(this.returnAction, rows, reason =>
      this.submitStatuses(rows, () => STATUS_INSPECTOR, 'Uyğunsuzluq müfəttişə qaytarıldı', reason));
  }

  private confirmThen(action: StatusAction, rows: DisruptionDto[], run: (reason?: string) => void): void {
    if (!rows.length) {
      this.notify.warning('Heç bir uyğunsuzluq seçilməyib');
      return;
    }
    this.confirmDialog.confirm(statusActionConfirm(action, rows.length, rows.map(r => this.itemLabel(r))))
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(result => run(result.reason));
  }

  private submitStatuses(
    rows: DisruptionDto[], statusOf: (row: DisruptionDto) => number, successMessage: string, reason?: string,
  ): void {
    if (!rows.length) {
      this.notify.warning('Heç bir uyğunsuzluq seçilməyib');
      return;
    }
    if (this.isSaving) return;

    const payload = rows.map(row => {
      const approve = new DisruptionApproveDto();
      approve.disruptionId.push(row.disruptionId);
      approve.status = statusOf(row);
      approve.reason = reason;
      return approve;
    });

    this.isSaving = true;
    this.disruptionService.aprovePlan(payload)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: response => {
          if (response.success) this.notify.success(successMessage);
          this.fill();
        },
        error: error => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi')),
      });
  }

  // ── Redaktə ─────────────────────────────────────────────────────────────

  openEditDialog(row: DisruptionDto): void {
    this.dialog.open<DisruptionEditDialogComponent, DisruptionDto, boolean>(DisruptionEditDialogComponent, {
      data: row,
      width: '560px',
      maxWidth: '95vw',
    }).afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fill());
  }
}

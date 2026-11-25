import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize } from 'rxjs';
import { InspectionsService } from '../inspections.service';
import { Section } from '../section.model';
import { ComponentService } from '../../components/component.service';
import { PlanInfo } from '../../components/models/plan-info.model';
import { PlanInfoSectionComponent } from '../../components/plan-info-section/plan-info-section.component';
import { InspectionSectionComponent } from '../../components/inspection-section/inspection-section.component';
import { DiruptionSectionComponent } from '../../components/diruption-section/diruption-section.component';
import { PlanApprove } from '../../plans/plan.model';
import { PlanService } from '../../plans/plan.service';
import { planStoreLabel } from '../../plans/plan-row';
import { PermissionService } from '../../../auth/permission.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { STATUS_ACTIONS, statusActionConfirm } from '../../../shared/status/status-actions';
import { StatusChange, StatusReasonComponent } from '../../../shared/status/status-reason.component';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, queryString } from '../../../shared/utils/query-state';

/** Təsdiq gözləyən yoxlamanın statusu və qərarın nəticə statusları (təsdiq 3→4, mobilə qaytarma 3→2). */
const AWAITING_APPROVAL = 3;
const APPROVED = 4;
const RETURNED_TO_MOBILE = 2;

const DEFAULT_LIST = '/inspections';
const APPROVE_LIST = '/inspections/approve';

@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [
    MatTabsModule, InspectionSectionComponent, DiruptionSectionComponent, PlanInfoSectionComponent,
    PageHeaderComponent, ListStateComponent, StatusChipComponent, StatusReasonComponent,
  ],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss'
})
export class InspectionDetailsComponent implements OnInit {
  private readonly inspectionService = inject(InspectionsService);
  private readonly componentService = inject(ComponentService);
  private readonly planService = inject(PlanService);
  private readonly permissions = inject(PermissionService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly approveAction = STATUS_ACTIONS.approve;
  readonly returnAction = STATUS_ACTIONS.returnToMobile;

  planId: number | null = null;
  /** `app-diruption-section` planı `{ id }` obyekti kimi gözləyir. */
  disruptionPlan: { id: number } | null = null;
  planInfo: PlanInfo | null = null;
  /** Son rədd / mobilə qaytarma səbəbi (yoxdursa null). */
  statusReason: StatusChange | null = null;

  /** Geri linki: gəldiyi siyahının filtrli URL-i (query `returnUrl`). */
  backLink: UrlTree = this.router.parseUrl(DEFAULT_LIST);
  backLabel = 'Yoxlamalara qayıt';

  sections: Section[] = [];
  /** headerId → şöbənin checklist faizi */
  sectionResults = new Map<number, number>();
  sectionsLoading = false;
  sectionsError: string | null = null;

  /** Plan təsdiq gözləyir və istifadəçinin Təsdiq səhifəsinə icazəsi var. */
  canDecide = false;
  isSaving = false;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.setBackLink(queryString(q, 'returnUrl'));

    this.planId = queryNumber(q, 'id');
    if (this.planId == null) return;
    this.disruptionPlan = { id: this.planId };
    this.loadSections();
    this.loadStatusReason(this.planId);
  }

  get title(): string {
    return this.planInfo ? planStoreLabel(this.planInfo) : 'Yoxlama';
  }

  get subtitle(): string {
    const plan = `Plan № ${this.planId}`;
    return this.canDecide ? `${plan} · Növbəti addım: yoxlamanı təsdiqləyin və ya mobilə qaytarın` : plan;
  }

  loadSections(): void {
    const planId = this.planId!;
    this.sectionsLoading = true;
    this.sectionsError = null;
    this.inspectionService.getSections(planId)
      .pipe(finalize(() => (this.sectionsLoading = false)))
      .subscribe({
        next: (response) => (this.sections = response.data ?? []),
        error: (error) => (this.sectionsError = apiErrorMessage(error, 'Şöbələr yüklənmədi')),
      });
    this.componentService.GetSectionChecklistResults(planId).subscribe({
      next: (response) => {
        this.sectionResults = new Map((response.data ?? []).map(r => [r.headerId, r.result]));
      },
      // Faizlər əlavə məlumatdır: alınmasa şöbələr nəticəsiz göstərilir
      error: () => (this.sectionResults = new Map()),
    });
  }

  private loadStatusReason(planId: number): void {
    this.planService.getStatusReason(planId).subscribe({
      next: (response) => (this.statusReason = response.data ?? null),
      // Səbəb əlavə məlumatdır: alınmasa səhifə onsuz göstərilir
      error: () => (this.statusReason = null),
    });
  }

  onPlanInfoLoaded(info: PlanInfo): void {
    this.planInfo = info;
    this.canDecide = info.status === AWAITING_APPROVAL && this.permissions.canShow('inspection-approve');
  }

  approve(): void {
    this.submit(APPROVED);
  }

  returnToMobile(): void {
    const items = this.planInfo ? [planStoreLabel(this.planInfo)] : [];
    this.confirmDialog.confirm(statusActionConfirm(this.returnAction, 1, items))
      .subscribe(result => {
        if (result) this.submit(RETURNED_TO_MOBILE, result.reason);
      });
  }

  private submit(status: number, reason?: string): void {
    if (this.isSaving || this.planId == null) return;
    const item: PlanApprove = { planId: this.planId, status, reason };
    this.isSaving = true;
    this.planService.aprovePlan([item])
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.notify.success(status === APPROVED ? 'Yoxlama təsdiqləndi' : 'Yoxlama mobilə qaytarıldı');
            this.canDecide = false;
            this.router.navigateByUrl(this.backLink);
          } else {
            this.notify.error(data.message || 'Status dəyişmədi');
          }
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi')),
      });
  }

  /** Yalnız yoxlama siyahılarına qayıdış qəbul olunur: URL-dən gələn başqa ünvana keçid yoxdur. */
  private setBackLink(returnUrl: string | null): void {
    if (!returnUrl || !returnUrl.startsWith(DEFAULT_LIST) || returnUrl.startsWith(`${DEFAULT_LIST}/details`)) {
      return;
    }
    this.backLink = this.router.parseUrl(returnUrl);
    if (returnUrl.startsWith(APPROVE_LIST)) {
      this.backLabel = 'Təsdiq siyahısına qayıt';
    }
  }
}

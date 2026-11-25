import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, Location } from '@angular/common';
import { PlanInfoSectionComponent } from '../../components/plan-info-section/plan-info-section.component';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../inspections/inspections.service';
import { InspectionSectionComponent } from '../../components/inspection-section/inspection-section.component';
import { DiruptionSectionComponent } from '../../components/diruption-section/diruption-section.component';
import { Section } from '../section.model';
import { finalize } from 'rxjs';
import { ComponentService } from '../../components/component.service';
import { PlanInfo } from '../../components/models/plan-info.model';
import { PermissionService } from '../../../auth/permission.service';
import { PlanService } from '../../plans/plan.service';
import { PlanApprove } from '../../plans/plan.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';

/** Təsdiq gözləyən yoxlamanın statusu və qərarın nəticə statusları. */
const AWAITING_APPROVAL = 3;
const APPROVED = 4;
const RETURNED_TO_MOBILE = 2;
@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, MatButtonModule, InspectionSectionComponent, DiruptionSectionComponent, PlanInfoSectionComponent, CommonModule],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss'
})

export class InspectionDetailsComponent {

  @Input() data: any; // Yeni 
  public datas: any;
  public stateDate: any
  public sections: Section[] = [];
  /** headerId → şöbənin checklist faizi */
  public sectionResults = new Map<number, number>();
  public planId: any;
  public placeId: any;
  public returnUrl?: string;
  /** Plan təsdiq gözləyir və istifadəçinin Təsdiq səhifəsinə icazəsi var. */
  public canDecide = false;
  public isSaving = false;
  readonly APPROVED = APPROVED;
  readonly RETURNED_TO_MOBILE = RETURNED_TO_MOBILE;
  constructor(
    private inspectionService: InspectionsService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private permissions: PermissionService,
    private planService: PlanService,
    private notify: NotificationService,
    private componentService: ComponentService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    const navState = navigation?.extras?.state;
    this.route.queryParamMap.subscribe(params => {
      const idFromQuery = params.get('id');
      const planIdFromQuery = params.get('planId');
      const returnUrlFromQuery = params.get('returnUrl');

      this.returnUrl = (navState as any)?.returnUrl || returnUrlFromQuery || this.returnUrl;

      if (navState) {
        this.stateDate = navState;
        // Əgər navState-də ayrıca planId yoxdursa, id-ni planId kimi istifadə edək
        const planIdFromState = (navState as any).planId ?? (navState as any).id;
        this.planId = planIdFromState ?? planIdFromQuery ?? idFromQuery;
      } else if (idFromQuery) {
        this.stateDate = { id: Number(idFromQuery), planId: planIdFromQuery ?? idFromQuery };
        this.planId = planIdFromQuery ?? idFromQuery;
      }

      if (this.stateDate?.id) {
        this.getSections();
      } else {
        this.location.back();
        return;
      }
    });
  }

  getSections() {
    this.inspectionService.getSections(this.stateDate.id).subscribe((x) => {
      this.sections = x.data;
    });
    this.componentService.GetSectionChecklistResults(Number(this.stateDate.id)).subscribe({
      next: (x) => {
        this.sectionResults = new Map((x.data ?? []).map(r => [r.headerId, r.result]));
      },
      // Faizlər əlavə məlumatdır: alınmasa şöbələr nəticəsiz göstərilir
      error: () => (this.sectionResults = new Map())
    });
  }

  onSection() {

    this.getSections();
  }

  onPlanInfoLoaded(info: PlanInfo) {
    this.canDecide = info.status === AWAITING_APPROVAL
      && this.permissions.canShow('inspection-approve');
  }

  /** Təsdiq ekranındakı sətir düymələri ilə eyni: 3→4 yekunlaşdırır, 3→2 mobilə qaytarır. */
  decide(status: number) {
    if (this.isSaving) return;
    const item = new PlanApprove();
    item.planId = Number(this.planId);
    item.status = status;
    this.isSaving = true;
    this.planService.aprovePlan([item])
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.notify.success(status === APPROVED ? 'Yoxlama təsdiqləndi' : 'Yoxlama mobilə qaytarıldı');
            this.canDecide = false;
            this.goBack();
          }
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi'))
      });
  }

  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.location.back();
    }
  }

}

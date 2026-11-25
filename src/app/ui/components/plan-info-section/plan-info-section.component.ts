import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { ComponentService } from '../component.service';
import { PlanInfo } from '../models/plan-info.model';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { NotificationService } from '../../../shared/services/notification.service';

/**
 * Yoxlama detalında planın əsas göstəriciləri: müfəttiş, plan və faktiki iş vaxtı, checklist nəticəsi.
 * Mağaza və status səhifə başlığındadır: plan məlumatı `planInfoLoaded` ilə valideynə ötürülür.
 */
@Component({
  selector: 'app-plan-info-section',
  standalone: true,
  imports: [AppDatePipe],
  templateUrl: './plan-info-section.component.html',
  styleUrl: './plan-info-section.component.scss'
})
export class PlanInfoSectionComponent implements OnChanges {
  private readonly componentService = inject(ComponentService);
  private readonly notify = inject(NotificationService);

  @Input() planId: number | string | null = null;
  /** Plan məlumatı yükləndikdə ötürülür: valideyn başlığı və statusa görə qərar düymələrini qurur. */
  @Output() planInfoLoaded = new EventEmitter<PlanInfo>();

  planInfo: PlanInfo | null = null;
  checklistScore = '';

  ngOnChanges(changes: SimpleChanges): void {
    if ('planId' in changes && this.planId !== null && this.planId !== '') {
      this.getPlanInfo(Number(this.planId));
      this.getChecklist(Number(this.planId));
    }
  }

  private getChecklist(planId: number): void {
    this.componentService.GetChecklistByPlanId(planId).subscribe({
      next: (response) => {
        if (response.success) {
          this.checklistScore = String(response.data ?? '');
        }
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Checklist nəticəsi yüklənmədi')),
    });
  }

  private getPlanInfo(planId: number): void {
    this.componentService.GetPlanInfoByPlanId(planId).subscribe({
      next: (response) => {
        if (response.success) {
          this.planInfo = response.data;
          this.planInfoLoaded.emit(response.data);
        } else {
          this.notify.error(response.message || 'Plan məlumatı yüklənmədi');
        }
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Plan məlumatı yüklənmədi')),
    });
  }
}

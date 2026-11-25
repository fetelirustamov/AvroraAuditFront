import { DatePipe, NgClass, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ComponentService } from '../component.service';
import { PlanInfo } from '../models/plan-info.model';
import { planStatusLabel } from '../../../shared/utils/plan-status';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-plan-info-section',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, NgClass, NgIf, DatePipe],
  templateUrl: './plan-info-section.component.html',
  styleUrl: './plan-info-section.component.scss'
})
export class PlanInfoSectionComponent implements OnChanges {

  @Input() data: any; // digər məlumatlar üçün
  @Input() planId: number | string | null = null; // inspection-details-dən gələn planId
  /** Plan məlumatı yükləndikdə ötürülür — valideyn statusa görə qərar verə bilsin. */
  @Output() planInfoLoaded = new EventEmitter<PlanInfo>();

  public planInfo: PlanInfo | null = null; // Plan məlumatlarını saxlamaq üçün dəyişən
  readonly statusLabel = planStatusLabel;

  checklistScore: string = '';
  type = 0;

  constructor(
    private componentService: ComponentService,
    private notify: NotificationService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ('planId' in changes) {
      if (this.planId !== null && this.planId !== '') {
        this.getPlanInfo();
        this.getChecklist();
      }
    }

  }

  getChecklist() {
    if (this.planId === null || this.planId === '') {
      return;
    }
    this.componentService.GetChecklistByPlanId(Number(this.planId)).subscribe({
      next: (response) => {
        if (response.success) {
          this.checklistScore = response.data.toString();
        }
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Checklist nəticəsi yüklənmədi')),
    });
  }

  private getPlanInfo() {
    if (this.planId === null || this.planId === '') {
      return;
    }
    this.componentService.GetPlanInfoByPlanId(Number(this.planId)).subscribe({
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

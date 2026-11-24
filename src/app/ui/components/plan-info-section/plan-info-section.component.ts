import { DatePipe, NgClass, NgIf } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ComponentService } from '../component.service';
import { PlanInfo } from '../models/plan-info.model';
import { planStatusLabel } from '../../../shared/utils/plan-status';

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

  public planInfo: PlanInfo | null = null; // Plan məlumatlarını saxlamaq üçün dəyişən
  readonly statusLabel = planStatusLabel;
  userImage = 'images/users/user49.jpg';

  checklistScore: string = '';
  type = 0;

  constructor(private componentService: ComponentService) { }

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
    this.componentService.GetChecklistByPlanId(Number(this.planId)).subscribe(response => {
      if (response.success) {
        this.checklistScore = response.data.toString();
      }
    });
  }

  private getPlanInfo() {
    if (this.planId === null || this.planId === '') {
      return;
    }
    this.componentService.GetPlanInfoByPlanId(Number(this.planId)).subscribe(response => {
      if (response.success) {
        this.planInfo = response.data;
      }
    });
  }

}

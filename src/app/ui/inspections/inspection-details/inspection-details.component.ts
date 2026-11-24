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
  public planId: any;
  public placeId: any;
  public returnUrl?: string;
  constructor(
    private inspectionService: InspectionsService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
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
      console.log('CHECKLIST getSections raw response:', x);
      console.log('CHECKLIST sections data:', JSON.stringify(x.data));
      this.sections = x.data;
    })
  }

  onSection() {

    this.getSections();
  }

  goBack() {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.location.back();
    }
  }

}

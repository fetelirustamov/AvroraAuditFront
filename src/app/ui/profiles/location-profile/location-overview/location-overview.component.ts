import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { ComplianceLegendComponent } from '../../../../shared/components/compliance-legend/compliance-legend.component';
import { complianceTone } from '../../../../shared/utils/compliance';
import { StageCode } from '../../../disruptions/disruption-tracking/disruption-tracking.model';
import { LocationProfileView } from '../location-inspection-summary.model';

/**
 * "Açıq" profil sorğusunda təsdiqlənmiş, amma bağlanmamış uyğunsuzluqdur (LocationProfileRepository):
 * izləmədə bu, mağaza zəncirindəki mərhələlərdir.
 */
const OPEN_STAGES: StageCode[] = ['STORE_ANSWER', 'CHAIN_APPROVAL', 'RETURNED', 'NO_CHAIN'];

/**
 * Mağazanın adı, kodu və üç göstərici: orta nəticə, açıq və gecikən uyğunsuzluq.
 * Uyğunsuzluq göstəriciləri izləmə ekranının süzülmüş siyahısına aparır.
 */
@Component({
  selector: 'app-location-overview',
  standalone: true,
  imports: [DecimalPipe, NgClass, NgTemplateOutlet, RouterLink, AppDatePipe, ComplianceLegendComponent],
  templateUrl: './location-overview.component.html',
  styleUrl: './location-overview.component.scss'
})
export class LocationOverviewComponent {
  @Input({ required: true }) profile!: LocationProfileView;
  /** İzləmə səhifəsinin süzgəci (`firm`, `location`); icazə yoxdursa `null` və linklər göstərilmir */
  @Input() trackingParams: Record<string, number | null> | null = null;
  /** Son tarixi keçən uyğunsuzluq sayı; yüklənməyibsə `null` */
  @Input() overdue: number | null = null;

  get resultTone(): string {
    return this.profile.summaries.length ? complianceTone(this.profile.avgPlanResult) : 'neutral';
  }

  get openParams(): Record<string, unknown> {
    return { ...this.trackingParams, stage: OPEN_STAGES };
  }

  get overdueParams(): Record<string, unknown> {
    return { ...this.trackingParams, overdue: 1 };
  }
}

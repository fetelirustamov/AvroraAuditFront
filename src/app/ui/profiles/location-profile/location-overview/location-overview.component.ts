import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { LocationProfileView } from '../location-inspection-summary.model';

/** Mağazanın adı, kodu, son yoxlama tarixi və əsas göstəricilər. Hər rəqəm bir dəfə göstərilir. */
@Component({
  selector: 'app-location-overview',
  standalone: true,
  imports: [DecimalPipe, AppDatePipe],
  templateUrl: './location-overview.component.html',
  styleUrl: './location-overview.component.scss'
})
export class LocationOverviewComponent {
  @Input({ required: true }) profile!: LocationProfileView;
}

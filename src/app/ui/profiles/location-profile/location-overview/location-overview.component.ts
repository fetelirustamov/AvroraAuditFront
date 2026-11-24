import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationProfileView } from '../location-inspection-summary.model';

@Component({
  selector: 'app-location-overview',
  imports: [CommonModule],
  templateUrl: './location-overview.component.html',
  styleUrl: './location-overview.component.scss'
})
export class LocationOverviewComponent {
  @Input() profile: LocationProfileView | null = null;

  constructor() {}

  barPct(value: number, cap: number): number {
    if (!cap) {
      return 0;
    }
    return Math.min(100, (value / cap) * 100);
  }

  maxCap(p: LocationProfileView): number {
    return Math.max(p.totalDiscrepancies, p.solved + p.open, 1);
  }
}

import { DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, ViewChild, inject } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { LocationInspectionPlanSummary, LocationProfileView } from '../location-inspection-summary.model';
import { InspectionTrendChartService } from './inspection-trend-chart.service';

/**
 * Mağaza profilinin dinamikası: nəticə faizi və uyğunsuzluqlar (iki ayrı qrafik) və son yoxlamalar.
 * Valideyn yalnız yoxlama olanda göstərir; mağaza dəyişəndə qrafiklər yenidən qurulur.
 */
@Component({
  selector: 'app-middle-section',
  standalone: true,
  imports: [MatTableModule, DecimalPipe, AppDatePipe],
  providers: [InspectionTrendChartService, AppDatePipe],
  templateUrl: './middle-section.component.html',
  styleUrl: './middle-section.component.scss'
})
export class MiddleSectionComponent implements OnChanges, AfterViewInit {
  @Input({ required: true }) profile!: LocationProfileView;

  @ViewChild('resultChart', { static: true }) private resultChart!: ElementRef<HTMLElement>;
  @ViewChild('countChart', { static: true }) private countChart!: ElementRef<HTMLElement>;

  private readonly trendChart = inject(InspectionTrendChartService);
  private readonly appDate = inject(AppDatePipe);

  readonly displayedColumns = ['startDate', 'planId', 'planResult', 'totalCount', 'solvedCount', 'openCount'];
  /** Son yoxlamalar: yenidən köhnəyə */
  recent: LocationInspectionPlanSummary[] = [];

  private viewReady = false;

  ngOnChanges(): void {
    this.recent = [...this.profile.summaries].sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (this.viewReady) { void this.renderCharts(); }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.renderCharts();
  }

  private renderCharts(): Promise<void> {
    const points = [...this.recent].reverse().map(r => ({
      label: this.appDate.transform(r.startDate),
      result: r.planResult,
      solved: r.solvedCount,
      open: r.openCount,
    }));
    return this.trendChart.render(this.resultChart.nativeElement, this.countChart.nativeElement, points);
  }
}

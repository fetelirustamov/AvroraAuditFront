import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InspectionTrendChartService } from './inspection-trend-chart.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { LocationProfileView } from '../location-inspection-summary.model';

@Component({
  selector: 'app-middle-section',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatMenuModule],
  providers: [DatePipe],
  templateUrl: './middle-section.component.html',
  styleUrl: './middle-section.component.scss'
})
export class MiddleSectionComponent implements OnChanges {
  @Input() profile: LocationProfileView | null = null;

  selectedTimeframe = 'Planlar';
  private chartReady = false;

  constructor(
    private trendChart: InspectionTrendChartService,
    private datePipe: DatePipe
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile']) {
      void this.syncChart();
    }
  }

  onTimeframeChange(): void {
    void this.syncChart();
  }

  private async syncChart(): Promise<void> {
    const rows = this.profile?.summaries?.length
      ? [...this.profile.summaries].sort((a, b) => a.startDate.localeCompare(b.startDate))
      : [];
    if (!rows.length) {
      return;
    }
    const categories = rows.map((r) => this.datePipe.transform(r.startDate, 'dd.MM.yy') ?? r.startDate);
    const series = [
      { name: 'Nəticə %', data: rows.map((r) => Math.round(r.planResult * 10) / 10) },
      { name: 'Ümumi', data: rows.map((r) => r.totalCount) },
      { name: 'Həll', data: rows.map((r) => r.solvedCount) },
      { name: 'Açıq', data: rows.map((r) => r.openCount) }
    ];
    if (!this.chartReady) {
      await this.trendChart.loadChart(series, categories);
      this.chartReady = true;
    } else {
      this.trendChart.updateChart(series, categories);
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return this.datePipe.transform(iso, 'd MMM yyyy') ?? iso;
  }
}

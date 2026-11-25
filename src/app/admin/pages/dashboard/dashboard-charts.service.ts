import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { chartColors } from '../../../shared/utils/chart-colors';

@Injectable({ providedIn: 'root' })
export class DashboardChartsService {
    private isBrowser: boolean;
    private charts: any[] = [];

    constructor(@Inject(PLATFORM_ID) platformId: any) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    // ── Donut: User Roles ─────────────────────────────────────────────────────
    async loadUserRolesChart(series: number[], labels: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const el = document.querySelector('#adm_chart_user_roles');
        if (!el) return;
        const ApexCharts = (await import('apexcharts')).default;
        const c = chartColors();
        const total = series.reduce((a, b) => a + b, 0);
        const options: any = {
            series,
            labels,
            chart: { type: 'donut', height: 280, fontFamily: 'inherit', animations: { enabled: true, speed: 600 } },
            // Rolların mənası yoxdur: vurğu + neytral şkala
            colors: [c.accent, ...c.neutral],
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '12px', fontWeight: 500, color: c.textMuted, offsetY: -4 },
                            value: { show: true, fontSize: '26px', fontWeight: 600, color: c.textStrong, offsetY: 6 },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Ümumi',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: c.textMuted,
                                formatter: () => total.toString()
                            }
                        }
                    }
                }
            },
            legend: {
                show: true,
                position: 'bottom',
                fontSize: '12px',
                fontWeight: 500,
                labels: { colors: c.textMuted },
                markers: { size: 7, shape: 'circle' },
                itemMargin: { horizontal: 6 }
            },
            dataLabels: { enabled: false },
            stroke: { width: 2, colors: [c.surface] },
            tooltip: { theme: 'light' }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Bar: Locations by Firm (admin dashboard) ──────────────────────────────
    async loadLocationsByFirmChart(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const el = document.querySelector('#adm_chart_activity');
        if (!el) return;
        const ApexCharts = (await import('apexcharts')).default;
        const c = chartColors();
        const isMany = categories.length > 6;
        const dynamicHeight = isMany ? Math.max(260, categories.length * 34) : 260;
        const options: any = {
            series,
            chart: {
                type: 'bar',
                height: dynamicHeight,
                fontFamily: 'inherit',
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 }
            },
            colors: [c.accent],
            plotOptions: {
                bar: {
                    columnWidth: '45%',
                    borderRadius: 4,
                    horizontal: isMany
                }
            },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            grid: {
                borderColor: c.border,
                strokeDashArray: 4,
                xaxis: { lines: { show: false } }
            },
            xaxis: {
                categories,
                labels: {
                    rotate: isMany ? 0 : -20,
                    style: { colors: c.textMuted, fontSize: '12px', fontWeight: 500 }
                },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: {
                labels: { style: { colors: c.textMuted, fontSize: '12px' } },
                allowDecimals: false
            },
            legend: { show: false },
            tooltip: { theme: 'light', shared: true, intersect: false }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts.push(chart);
    }

    destroyAll(): void {
        this.charts.forEach(c => c && c.destroy && c.destroy());
        this.charts = [];
    }
}

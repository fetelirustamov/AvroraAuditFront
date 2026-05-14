import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class DashboardChartsService {
    private isBrowser: boolean;
    private charts: any[] = [];

    constructor(@Inject(PLATFORM_ID) platformId: any) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    private isDarkMode(): boolean {
        if (!this.isBrowser) return false;
        return document.body.classList.contains('dark-theme');
    }

    private getGridColor(): string {
        return this.isDarkMode() ? '#1E293B' : '#F1F5F9';
    }

    private getLabelColor(): string {
        return this.isDarkMode() ? '#64748B' : '#94A3B8';
    }

    private getTooltipTheme(): string {
        return this.isDarkMode() ? 'dark' : 'light';
    }

    // ── KPI Sparkline ──────────────────────────────────────────────────────────
    async loadSparkline(id: string, data: number[], color: string): Promise<void> {
        if (!this.isBrowser) return;
        const el = document.querySelector('#' + id);
        if (!el) return;
        const ApexCharts = (await import('apexcharts')).default;
        const options: any = {
            series: [{ data }],
            chart: { type: 'area', height: 52, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.0, stops: [0, 100] } },
            colors: [color],
            tooltip: { enabled: false }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Bar: Plans by Store ────────────────────────────────────────────────────
    async loadPlansByStore(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const isMany = categories.length > 10;
        const dynamicHeight = isMany ? Math.max(320, categories.length * 32) : 300;
        const options: any = {
            series,
            chart: {
                type: 'bar',
                height: dynamicHeight,
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 }
            },
            colors: ['#3B82F6', '#22C55E', '#F59E0B', '#A78BFA'],
            plotOptions: {
                bar: {
                    columnWidth: isMany ? '55%' : '50%',
                    borderRadius: 4,
                    horizontal: isMany
                }
            },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            grid: {
                borderColor: this.getGridColor(),
                strokeDashArray: 4,
                xaxis: { lines: { show: false } }
            },
            xaxis: {
                categories,
                labels: {
                    rotate: isMany ? 0 : -30,
                    style: { colors: this.getLabelColor(), fontSize: '11px', fontWeight: 500 }
                },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: { labels: { style: { colors: this.getLabelColor(), fontSize: '11px' } } },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '11px',
                fontWeight: 500,
                labels: { colors: this.getLabelColor() },
                markers: { size: 6, shape: 'circle' },
                itemMargin: { horizontal: 6 }
            },
            tooltip: { theme: this.getTooltipTheme(), shared: true, intersect: false }
        };
        const chart = new ApexCharts(document.querySelector('#adm_chart_plans_by_store'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Area: Monthly Trend ────────────────────────────────────────────────────
    async loadPlanTrend(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const lastIdx = categories.length - 1;
        const options: any = {
            series,
            chart: {
                type: 'area',
                height: 260,
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: true, speed: 600 }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2.5 },
            colors: ['#6366F1', '#22C55E'],
            fill: {
                type: 'gradient',
                gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.0, stops: [0, 100] }
            },
            markers: {
                size: 0,
                hover: { size: 5 },
                discrete: [
                    { seriesIndex: 0, dataPointIndex: lastIdx, fillColor: '#6366F1', strokeColor: '#fff', size: 6, strokeWidth: 2 },
                    { seriesIndex: 1, dataPointIndex: lastIdx, fillColor: '#22C55E', strokeColor: '#fff', size: 6, strokeWidth: 2 }
                ]
            },
            grid: { borderColor: this.getGridColor(), strokeDashArray: 4, padding: { top: -10 } },
            xaxis: {
                categories,
                labels: { style: { colors: this.getLabelColor(), fontSize: '11px', fontWeight: 500 } },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: { labels: { style: { colors: this.getLabelColor(), fontSize: '11px' } } },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '11px',
                labels: { colors: this.getLabelColor() },
                markers: { size: 6, shape: 'circle' }
            },
            tooltip: { theme: this.getTooltipTheme(), shared: true, intersect: false }
        };
        const chart = new ApexCharts(document.querySelector('#adm_chart_plan_trend'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Donut: Plan Status (with centered %) ──────────────────────────────────
    async loadPlanStatus(series: number[], labels: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const total = series.reduce((a, b) => a + b, 0);
        const completedPct = total > 0 ? Math.round((series[0] / total) * 100) : 0;
        const labelColor = this.isDarkMode() ? '#94A3B8' : '#64748B';
        const valueColor = this.isDarkMode() ? '#F1F5F9' : '#0F172A';
        const options: any = {
            series,
            labels,
            chart: { type: 'donut', height: 280, animations: { enabled: true, speed: 600 } },
            colors: ['#22C55E', '#F59E0B', '#A78BFA', '#EF4444', '#60A5FA'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '70%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '12px', fontWeight: 500, color: labelColor, offsetY: -4 },
                            value: { show: true, fontSize: '28px', fontWeight: 800, color: valueColor, offsetY: 6 },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Tamamlanan',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: labelColor,
                                formatter: () => completedPct + '%'
                            }
                        }
                    }
                }
            },
            legend: {
                show: true,
                position: 'bottom',
                fontSize: '11px',
                fontWeight: 500,
                labels: { colors: labelColor },
                markers: { size: 7, shape: 'circle' },
                itemMargin: { horizontal: 6 }
            },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            tooltip: { theme: this.getTooltipTheme() }
        };
        const chart = new ApexCharts(document.querySelector('#adm_chart_plan_status'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Stacked Bar: Dept Noncompliance ───────────────────────────────────────
    async loadDeptNoncompliance(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const options: any = {
            series,
            chart: {
                type: 'bar',
                height: 280,
                stacked: true,
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 }
            },
            plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '55%' } },
            colors: ['#22C55E', '#F59E0B', '#EF4444'],
            dataLabels: {
                enabled: true,
                style: { fontSize: '10px', fontWeight: 600, colors: ['#fff'] },
                formatter: (val: number) => val > 0 ? val : ''
            },
            grid: { borderColor: this.getGridColor(), strokeDashArray: 4, yaxis: { lines: { show: false } } },
            xaxis: {
                categories,
                labels: { style: { colors: this.getLabelColor(), fontSize: '11px' } },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: { labels: { style: { colors: this.getLabelColor(), fontSize: '12px', fontWeight: 500 } } },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '11px',
                fontWeight: 500,
                labels: { colors: this.getLabelColor() },
                markers: { size: 6, shape: 'circle' }
            },
            tooltip: { theme: this.getTooltipTheme(), shared: true, intersect: false }
        };
        const chart = new ApexCharts(document.querySelector('#ui_chart_dept_noncompliance'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Radial Bar: Checklist Performance ─────────────────────────────────────
    async loadChecklistRadialBar(scores: number[], labels: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const labelColor = this.isDarkMode() ? '#94A3B8' : '#64748B';
        const totalColor = this.isDarkMode() ? '#F1F5F9' : '#0F172A';
        const options: any = {
            series: scores,
            labels,
            chart: { type: 'radialBar', height: 300, toolbar: { show: false } },
            plotOptions: {
                radialBar: {
                    hollow: { size: '38%', background: 'transparent' },
                    track: { background: this.isDarkMode() ? '#1E293B' : '#F1F5F9', strokeWidth: '100%' },
                    dataLabels: {
                        name: { fontSize: '11px', fontWeight: 500, color: labelColor, offsetY: -4 },
                        value: { fontSize: '18px', fontWeight: 700, color: totalColor, offsetY: 4 },
                        total: {
                            show: true,
                            label: 'Ortalama',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: labelColor,
                            formatter: () => avg + '%'
                        }
                    }
                }
            },
            colors: ['#3B82F6', '#22C55E', '#F59E0B', '#A78BFA'],
            stroke: { lineCap: 'round' },
            legend: {
                show: true,
                position: 'bottom',
                fontSize: '11px',
                labels: { colors: labelColor },
                markers: { size: 6, shape: 'circle' }
            }
        };
        const chart = new ApexCharts(document.querySelector('#ui_chart_radialbar'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Heatmap: Store × Dept (blue scale, numbers visible) ──────────────────
    async loadStoreDeptHeatmap(series: { name: string; data: { x: string; y: number }[] }[]): Promise<void> {
        if (!this.isBrowser) return;
        const ApexCharts = (await import('apexcharts')).default;
        const labelColor = this.getLabelColor();
        const options: any = {
            series,
            chart: {
                type: 'heatmap',
                height: 300,
                toolbar: { show: false },
                animations: { enabled: true, speed: 500 }
            },
            dataLabels: {
                enabled: true,
                style: { fontSize: '11px', fontWeight: 700, colors: ['#1E293B'] },
                formatter: (val: number) => val
            },
            colors: ['#3B82F6'],
            plotOptions: {
                heatmap: {
                    radius: 4,
                    enableShades: false,
                    colorScale: {
                        ranges: [
                            { from: 0, to: 2,  name: 'Çox az',  color: '#F8FAFC' },
                            { from: 3, to: 5,  name: 'Az',      color: '#DBEAFE' },
                            { from: 6, to: 8,  name: 'Orta',    color: '#93C5FD' },
                            { from: 9, to: 11, name: 'Yüksək',  color: '#3B82F6' },
                            { from: 12, to: 100, name: 'Kritik', color: '#1D4ED8' }
                        ]
                    }
                }
            },
            grid: { padding: { top: 0, right: 4, bottom: 0, left: 4 } },
            xaxis: {
                labels: { style: { colors: labelColor, fontSize: '11px', fontWeight: 500 } },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: { labels: { style: { colors: labelColor, fontSize: '11px', fontWeight: 500 } } },
            legend: {
                show: true,
                position: 'top',
                horizontalAlign: 'right',
                fontSize: '11px',
                labels: { colors: labelColor },
                markers: { size: 9, shape: 'square' },
                itemMargin: { horizontal: 8 }
            },
            tooltip: { theme: this.getTooltipTheme() }
        };
        const chart = new ApexCharts(document.querySelector('#ui_chart_heatmap'), options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Donut: User Roles ─────────────────────────────────────────────────────
    async loadUserRolesChart(series: number[], labels: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const el = document.querySelector('#adm_chart_user_roles');
        if (!el) return;
        const ApexCharts = (await import('apexcharts')).default;
        const total = series.reduce((a, b) => a + b, 0);
        const labelColor = this.isDarkMode() ? '#94A3B8' : '#64748B';
        const valueColor = this.isDarkMode() ? '#F1F5F9' : '#0F172A';
        const options: any = {
            series,
            labels,
            chart: { type: 'donut', height: 280, animations: { enabled: true, speed: 600 } },
            colors: ['#6366F1', '#22C55E', '#F59E0B', '#A78BFA'],
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '12px', fontWeight: 500, color: labelColor, offsetY: -4 },
                            value: { show: true, fontSize: '26px', fontWeight: 800, color: valueColor, offsetY: 6 },
                            total: {
                                show: true,
                                showAlways: true,
                                label: 'Ümumi',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: labelColor,
                                formatter: () => total.toString()
                            }
                        }
                    }
                }
            },
            legend: {
                show: true,
                position: 'bottom',
                fontSize: '11px',
                fontWeight: 500,
                labels: { colors: labelColor },
                markers: { size: 7, shape: 'circle' },
                itemMargin: { horizontal: 6 }
            },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            tooltip: { theme: this.getTooltipTheme() }
        };
        const chart = new ApexCharts(el, options);
        chart.render();
        this.charts.push(chart);
    }

    // ── Area: System Activity ──────────────────────────────────────────────────
    async loadSystemActivityChart(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) return;
        const el = document.querySelector('#adm_chart_activity');
        if (!el) return;
        const ApexCharts = (await import('apexcharts')).default;
        const lastIdx = categories.length - 1;
        const options: any = {
            series,
            chart: {
                type: 'area',
                height: 260,
                toolbar: { show: false },
                zoom: { enabled: false },
                animations: { enabled: true, speed: 600 }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2.5 },
            colors: ['#6366F1', '#22C55E'],
            fill: {
                type: 'gradient',
                gradient: { type: 'vertical', shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.0, stops: [0, 100] }
            },
            markers: {
                size: 0,
                hover: { size: 5 },
                discrete: [
                    { seriesIndex: 0, dataPointIndex: lastIdx, fillColor: '#6366F1', strokeColor: '#fff', size: 6, strokeWidth: 2 },
                    { seriesIndex: 1, dataPointIndex: lastIdx, fillColor: '#22C55E', strokeColor: '#fff', size: 6, strokeWidth: 2 }
                ]
            },
            grid: { borderColor: this.getGridColor(), strokeDashArray: 4, padding: { top: -10 } },
            xaxis: {
                categories,
                labels: { style: { colors: this.getLabelColor(), fontSize: '11px', fontWeight: 500 } },
                axisTicks: { show: false },
                axisBorder: { show: false }
            },
            yaxis: { labels: { style: { colors: this.getLabelColor(), fontSize: '11px' } } },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '11px',
                labels: { colors: this.getLabelColor() },
                markers: { size: 6, shape: 'circle' }
            },
            tooltip: { theme: this.getTooltipTheme(), shared: true, intersect: false }
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

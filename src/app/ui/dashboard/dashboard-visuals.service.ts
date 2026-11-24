import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MONTH_SHORT_LABELS } from './dashboard.model';

/**
 * Dashboard qrafikləri. ApexCharts dinamik `import()` ilə yüklənir — səhifə
 * açılmayana qədər paketə düşmür. Admin panelindəki `DashboardChartsService`
 * ayrıca qalır: orada sabit element ID-ləri və köhnə stil var, burada isə
 * element referansı ötürülür və palitra vahiddir.
 */
@Injectable()
export class DashboardVisualsService {
    private readonly isBrowser: boolean;
    private charts: any[] = [];

    /** Vahid palitra — bütün qrafiklərdə eyni məna, eyni rəng */
    private readonly palette = {
        primary: '#605DFF',
        teal: '#0EA5A4',
        amber: '#F59E0B',
        rose: '#F43F5E',
        violet: '#8B5CF6',
        sky: '#3584FC',
        emerald: '#25B003',
        grid: '#F1F5F9',
        label: '#94A3B8'
    };

    /** Kateqoriyalı qrafiklərdə (treemap, funnel) növbə ilə işlədilir */
    private readonly categorical = [
        '#605DFF', '#0EA5A4', '#F59E0B', '#F43F5E',
        '#8B5CF6', '#3584FC', '#25B003', '#EC4899'
    ];

    constructor(@Inject(PLATFORM_ID) platformId: any) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    destroyAll(): void {
        this.charts.forEach(chart => {
            try { chart.destroy(); } catch { /* artıq söküləcək */ }
        });
        this.charts = [];
    }

    // ── Uyğunluq indeksi (radial gauge) ──────────────────────────────────────

    async renderComplianceGauge(elementId: string, value: number): Promise<void> {
        await this.render(elementId, {
            series: [Math.max(0, Math.min(100, Math.round(value)))],
            chart: { type: 'radialBar', height: 260, sparkline: { enabled: true } },
            plotOptions: {
                radialBar: {
                    startAngle: -135,
                    endAngle: 135,
                    hollow: { size: '62%' },
                    track: { background: '#EEF0FF', strokeWidth: '100%' },
                    dataLabels: {
                        name: { offsetY: 24, color: this.palette.label, fontSize: '12px' },
                        value: {
                            offsetY: -16,
                            fontSize: '34px',
                            fontWeight: 700,
                            color: '#1E2533',
                            formatter: (val: number) => `${val}%`
                        }
                    }
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: 'horizontal',
                    gradientToColors: [this.palette.teal],
                    stops: [0, 100]
                }
            },
            colors: [this.palette.primary],
            stroke: { lineCap: 'round' },
            labels: ['Uyğunluq indeksi']
        });
    }

    // ── KPI kartlarındakı mini qrafik ────────────────────────────────────────

    async renderSparkline(elementId: string, data: number[], color: string): Promise<void> {
        await this.render(elementId, {
            series: [{ data }],
            chart: { type: 'area', height: 44, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            fill: {
                type: 'gradient',
                gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] }
            },
            colors: [color],
            tooltip: { enabled: false }
        });
    }

    // ── Aylıq trend: sütun (say) + xətt (uyğunluq %) ─────────────────────────

    async renderTrend(
        elementId: string,
        inspections: number[],
        findings: number[],
        compliance: number[]
    ): Promise<void> {
        await this.render(elementId, {
            series: [
                { name: 'Yoxlama', type: 'column', data: inspections },
                { name: 'Uyğunsuzluq', type: 'column', data: findings },
                { name: 'Uyğunluq (%)', type: 'line', data: compliance }
            ],
            chart: {
                height: 340,
                type: 'line',
                stacked: false,
                toolbar: { show: false },
                fontFamily: 'inherit'
            },
            colors: [this.palette.primary, this.palette.rose, this.palette.teal],
            stroke: { width: [0, 0, 3], curve: 'smooth' },
            plotOptions: { bar: { columnWidth: '52%', borderRadius: 5 } },
            fill: { opacity: [0.9, 0.75, 1] },
            markers: { size: [0, 0, 4], strokeWidth: 2, hover: { size: 6 } },
            dataLabels: { enabled: false },
            xaxis: {
                categories: MONTH_SHORT_LABELS,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: this.palette.label, fontSize: '11px' } }
            },
            yaxis: [
                {
                    seriesName: 'Yoxlama',
                    title: { text: 'Say', style: { color: this.palette.label, fontWeight: 500 } },
                    labels: { style: { colors: this.palette.label } }
                },
                { seriesName: 'Yoxlama', show: false },
                {
                    opposite: true,
                    seriesName: 'Uyğunluq (%)',
                    min: 0,
                    max: 100,
                    title: { text: 'Uyğunluq (%)', style: { color: this.palette.label, fontWeight: 500 } },
                    labels: {
                        style: { colors: this.palette.label },
                        formatter: (val: number) => `${Math.round(val)}%`
                    }
                }
            ],
            grid: { borderColor: this.palette.grid, strokeDashArray: 4 },
            legend: { position: 'top', horizontalAlign: 'right', markers: { radius: 4 } },
            tooltip: { shared: true, intersect: false }
        });
    }

    // ── Şöbə profili (radar): cari dövr vs əvvəlki ───────────────────────────

    async renderSectionRadar(
        elementId: string,
        sections: string[],
        current: number[],
        previous: number[]
    ): Promise<void> {
        await this.render(elementId, {
            series: [
                { name: 'Cari dövr', data: current },
                { name: 'Əvvəlki dövr', data: previous }
            ],
            chart: { type: 'radar', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
            colors: [this.palette.primary, this.palette.amber],
            stroke: { width: 2 },
            fill: { opacity: [0.25, 0.12] },
            markers: { size: 3 },
            xaxis: { categories: sections, labels: { style: { colors: sections.map(() => this.palette.label), fontSize: '11px' } } },
            yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (val: number) => `${Math.round(val)}%` } },
            plotOptions: { radar: { polygons: { strokeColors: this.palette.grid, connectorColors: this.palette.grid } } },
            legend: { position: 'top', horizontalAlign: 'right', markers: { radius: 4 } },
            tooltip: { y: { formatter: (val: number) => `${val}%` } }
        });
    }

    /**
     * Radar ən azı 3 ox tələb edir — 1–2 şöbədə şaquli xəttə çevrilir.
     * Belə hallarda eyni məlumat üfüqi müqayisə sütunları ilə göstərilir.
     */
    async renderSectionBars(
        elementId: string,
        sections: string[],
        current: number[],
        previous: number[]
    ): Promise<void> {
        await this.render(elementId, {
            series: [
                { name: 'Cari dövr', data: current },
                { name: 'Əvvəlki dövr', data: previous }
            ],
            chart: { type: 'bar', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
            colors: [this.palette.primary, this.palette.amber],
            plotOptions: { bar: { horizontal: true, barHeight: '46%', borderRadius: 5 } },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => `${val}%`,
                style: { fontSize: '11px', fontWeight: 700 },
                offsetX: 26
            },
            xaxis: {
                categories: sections,
                min: 0,
                max: 100,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: this.palette.label, fontSize: '11px' },
                    formatter: (val: string) => `${Math.round(Number(val))}%`
                }
            },
            yaxis: { labels: { style: { colors: this.palette.label, fontSize: '12px' } } },
            grid: { borderColor: this.palette.grid, strokeDashArray: 4 },
            legend: { position: 'top', horizontalAlign: 'right', markers: { radius: 4 } },
            tooltip: { y: { formatter: (val: number) => `${val}%` } }
        });
    }

    // ── Uyğunsuzluq kateqoriyaları (treemap) ─────────────────────────────────

    async renderCategoryTreemap(elementId: string, items: { name: string; value: number }[]): Promise<void> {
        await this.render(elementId, {
            series: [{ data: items.map(i => ({ x: i.name, y: i.value })) }],
            chart: { type: 'treemap', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
            colors: this.categorical,
            plotOptions: { treemap: { distributed: true, enableShades: false, borderRadius: 6 } },
            legend: { show: false },
            dataLabels: {
                enabled: true,
                style: { fontSize: '12px', fontWeight: 600 },
                formatter: (text: string, op: any) => [text, op.value]
            },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Şöbə × ay istilik xəritəsi ───────────────────────────────────────────

    async renderSectionHeatmap(
        elementId: string,
        series: { name: string; data: { x: string; y: number }[] }[]
    ): Promise<void> {
        await this.render(elementId, {
            series,
            chart: {
                type: 'heatmap',
                height: Math.max(260, series.length * 42 + 80),
                toolbar: { show: false },
                fontFamily: 'inherit'
            },
            dataLabels: { enabled: false },
            colors: [this.palette.primary],
            plotOptions: {
                heatmap: {
                    radius: 6,
                    enableShades: false,
                    colorScale: {
                        ranges: [
                            { from: 0, to: 0, color: '#F1F5F9', name: 'yoxdur' },
                            { from: 1, to: 3, color: '#DCFCE7', name: '1–3' },
                            { from: 4, to: 8, color: '#FEF3C7', name: '4–8' },
                            { from: 9, to: 15, color: '#FED7AA', name: '9–15' },
                            { from: 16, to: 999999, color: '#FECACA', name: '16+' }
                        ]
                    }
                }
            },
            stroke: { width: 3, colors: ['#FFFFFF'] },
            xaxis: {
                type: 'category',
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: this.palette.label, fontSize: '11px' } }
            },
            yaxis: { labels: { style: { colors: this.palette.label, fontSize: '11px' } } },
            legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px' },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Risk matrisi (bubble): say × uyğunluq × açıq uyğunsuzluq ─────────────

    async renderRiskMatrix(
        elementId: string,
        series: { name: string; color: string; data: { x: number; y: number; z: number; label: string }[] }[]
    ): Promise<void> {
        // Ox son həddində qalan kürə yarıya qədər kəsilir — ona görə oxa
        // ehtiyat sahə verilir, qrafik sahəsi isə `grid.padding` ilə daraldılır.
        const xValues = series.flatMap(s => s.data.map(p => p.x));
        const maxX = Math.max(1, ...xValues);
        const xMax = maxX + Math.max(1, Math.ceil(maxX * 0.2));

        await this.render(elementId, {
            series: series.map(s => ({ name: s.name, data: s.data })),
            chart: {
                type: 'bubble',
                height: 360,
                toolbar: { show: false },
                fontFamily: 'inherit',
                zoom: { enabled: false }
            },
            colors: series.map(s => s.color),
            fill: { opacity: 0.75 },
            dataLabels: { enabled: false },
            plotOptions: { bubble: { minBubbleRadius: 6, maxBubbleRadius: 34 } },
            xaxis: {
                title: { text: 'Yoxlama sayı', style: { color: this.palette.label, fontWeight: 500 } },
                min: 0,
                max: xMax,
                tickAmount: Math.min(6, xMax),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: this.palette.label },
                    formatter: (val: string) => `${Math.round(Number(val))}`
                }
            },
            yaxis: {
                // Faktiki şkala 0–100-dür; sərhəd ±20 genişləndirilib ki, 0%
                // və 100%-dəki kürələr oxun üstündə yarımçıq qalmasın.
                // tickAmount 7 → addım 20, yəni nişanlar 0, 20 … 100-ə düşür;
                // aralıqdan kənar iki nişan gizlədilir.
                min: -20,
                max: 120,
                tickAmount: 7,
                title: { text: 'Uyğunluq (%)', style: { color: this.palette.label, fontWeight: 500 } },
                labels: {
                    style: { colors: this.palette.label },
                    formatter: (val: number) => (val < 0 || val > 100 ? '' : `${Math.round(val)}%`)
                }
            },
            grid: {
                borderColor: this.palette.grid,
                strokeDashArray: 4,
                // 0% və ya maksimum nöqtədəki kürələr sahədən kənara çıxmasın
                padding: { top: 12, right: 28, bottom: 12, left: 12 }
            },
            legend: { position: 'top', horizontalAlign: 'right', markers: { radius: 4 } },
            tooltip: {
                custom: ({ seriesIndex, dataPointIndex }: any) => {
                    const point = series[seriesIndex]?.data[dataPointIndex];
                    if (!point) { return ''; }
                    return `
                        <div class="apex-bubble-tip">
                            <strong>${point.label}</strong>
                            <span>Yoxlama: ${point.x}</span>
                            <span>Uyğunluq: ${point.y}%</span>
                            <span>Açıq uyğunsuzluq: ${point.z}</span>
                        </div>`;
                }
            }
        });
    }

    // ── Plan həyat dövrü (funnel görünüşlü üfüqi sütun) ──────────────────────

    async renderStatusFunnel(elementId: string, labels: string[], values: number[]): Promise<void> {
        await this.render(elementId, {
            series: [{ name: 'Plan', data: values }],
            chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true,
                    barHeight: '62%',
                    borderRadius: 6,
                    dataLabels: { position: 'center' }
                }
            },
            colors: this.categorical,
            dataLabels: {
                enabled: true,
                style: { fontSize: '12px', fontWeight: 700, colors: ['#FFFFFF'] }
            },
            xaxis: {
                categories: labels,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: this.palette.label, fontSize: '11px' } }
            },
            yaxis: { labels: { style: { colors: this.palette.label, fontSize: '12px' } } },
            grid: { borderColor: this.palette.grid, strokeDashArray: 4, xaxis: { lines: { show: true } } },
            legend: { show: false },
            tooltip: { y: { formatter: (val: number) => `${val} plan` } }
        });
    }

    // ── Ortaq render ─────────────────────────────────────────────────────────

    private async render(elementId: string, options: any): Promise<void> {
        if (!this.isBrowser) { return; }

        const element = document.querySelector(`#${elementId}`);
        if (!element) { return; }

        const ApexCharts = (await import('apexcharts')).default;
        const chart = new ApexCharts(element, options);
        await chart.render();
        this.charts.push(chart);
    }
}

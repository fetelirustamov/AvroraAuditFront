import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MONTH_SHORT_LABELS } from './dashboard.model';
import { chartColors } from '../../shared/utils/chart-colors';

/** Risk zonasının qrafik rəngi — `ChartColors`-dakı status açarı */
export type RiskTone = 'success' | 'warning' | 'danger';

/**
 * Dashboard qrafikləri. ApexCharts dinamik `import()` ilə yüklənir — səhifə
 * açılmayana qədər paketə düşmür. Admin panelindəki `DashboardChartsService`
 * ayrıca qalır: orada sabit element ID-ləri var, burada isə element
 * referansı ötürülür.
 *
 * Rənglər `chartColors()` ilə token-lərdən oxunur: mənasız seriya vurğu və ya
 * neytral, uyğunluq/risk isə status rəngidir.
 */
@Injectable()
export class DashboardVisualsService {
    private readonly isBrowser: boolean;
    private charts: any[] = [];

    constructor(@Inject(PLATFORM_ID) platformId: any) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    destroyAll(): void {
        this.charts.forEach(chart => {
            try { chart.destroy(); } catch { /* artıq söküləcək */ }
        });
        this.charts = [];
    }

    // ── KPI kartlarındakı mini qrafik ────────────────────────────────────────

    async renderSparkline(elementId: string, data: number[]): Promise<void> {
        if (!this.isBrowser) { return; }
        const c = chartColors();
        await this.render(elementId, {
            series: [{ data }],
            chart: { type: 'area', height: 44, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'solid', opacity: 0.08 },
            colors: [c.accent],
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
        if (!this.isBrowser) { return; }
        const c = chartColors();
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
            // Yoxlama sayı mənasız say → açıq neytral; uyğunsuzluq risk göstəricisidir → status (danger);
            // əsas göstərici (uyğunluq) → vurğu. Tünd neytral (gray-700) ekranda qara görünürdü.
            colors: [c.neutral[2], c.danger, c.accent],
            stroke: { width: [0, 0, 2], curve: 'smooth' },
            plotOptions: { bar: { columnWidth: '52%', borderRadius: 4 } },
            fill: { opacity: [1, 1, 1] },
            markers: { size: [0, 0, 4], strokeWidth: 2, strokeColors: c.surface, hover: { size: 6 } },
            dataLabels: { enabled: false },
            xaxis: {
                categories: MONTH_SHORT_LABELS,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' } }
            },
            yaxis: [
                {
                    seriesName: 'Yoxlama',
                    title: { text: 'Say', style: { color: c.textMuted, fontWeight: 500 } },
                    labels: { style: { colors: c.textMuted } }
                },
                { seriesName: 'Yoxlama', show: false },
                {
                    opposite: true,
                    seriesName: 'Uyğunluq (%)',
                    min: 0,
                    max: 100,
                    title: { text: 'Uyğunluq (%)', style: { color: c.textMuted, fontWeight: 500 } },
                    labels: {
                        style: { colors: c.textMuted },
                        formatter: (val: number) => `${Math.round(val)}%`
                    }
                }
            ],
            grid: { borderColor: c.border, strokeDashArray: 4 },
            legend: { position: 'top', horizontalAlign: 'right', labels: { colors: c.text }, markers: { radius: 4 } },
            tooltip: { shared: true, intersect: false }
        });
    }

    // ── Şöbələr üzrə uyğunluq: cari dövr vs əvvəlki (üfüqi sütunlar) ─────────

    async renderSectionBars(
        elementId: string,
        sections: string[],
        current: number[],
        previous: number[]
    ): Promise<void> {
        if (!this.isBrowser) { return; }
        const c = chartColors();
        await this.render(elementId, {
            series: [
                { name: 'Cari dövr', data: current },
                { name: 'Əvvəlki dövr', data: previous }
            ],
            chart: { type: 'bar', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
            colors: [c.accent, c.neutral[2]],
            // Yazı sütunun sonundan kənarda: sütunun üstünə düşəndə oxunmur
            plotOptions: { bar: { horizontal: true, barHeight: '62%', borderRadius: 3, dataLabels: { position: 'top' } } },
            dataLabels: {
                enabled: true,
                formatter: (val: number) => `${val}%`,
                style: { fontSize: '12px', fontWeight: 600, colors: [c.text] },
                offsetX: 24
            },
            xaxis: {
                categories: sections,
                min: 0,
                max: 100,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: c.textMuted, fontSize: '12px' },
                    formatter: (val: string) => `${Math.round(Number(val))}%`
                }
            },
            yaxis: { labels: { style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, strokeDashArray: 4, padding: { right: 28 } },
            legend: { position: 'top', horizontalAlign: 'right', labels: { colors: c.text }, markers: { radius: 4 } },
            tooltip: { y: { formatter: (val: number) => `${val}%` } }
        });
    }

    // ── Uyğunsuzluq kateqoriyaları: say üzrə sıralanmış üfüqi sütunlar ───────

    async renderCategoryBars(elementId: string, items: { name: string; value: number }[]): Promise<void> {
        if (!this.isBrowser) { return; }
        const c = chartColors();
        await this.render(elementId, {
            series: [{ name: 'Uyğunsuzluq', data: items.map(i => i.value) }],
            chart: { type: 'bar', height: 340, toolbar: { show: false }, fontFamily: 'inherit' },
            // Uyğunsuzluq sayı riskdir → danger ailəsi. On tam tünd qırmızı sütun ağır görünməsin deyə
            // dolğu yarı şəffaf, kənar tam rəngdədir; müqayisə uzunluqladır, rəng hamısında eynidir.
            colors: [c.danger],
            fill: { opacity: 0.45 },
            stroke: { show: true, width: 1, colors: [c.danger] },
            plotOptions: { bar: { horizontal: true, barHeight: '58%', borderRadius: 4, dataLabels: { position: 'top' } } },
            dataLabels: {
                enabled: true,
                offsetX: 22,
                style: { fontSize: '12px', fontWeight: 600, colors: [c.text] }
            },
            xaxis: {
                categories: items.map(i => i.name),
                // Ən uzun sütunun yazısı üçün ehtiyat yer
                min: 0,
                max: Math.ceil(Math.max(1, ...items.map(i => i.value)) * 1.15),
                tickAmount: 5,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' }, formatter: (val: string) => `${Math.round(Number(val))}` }
            },
            yaxis: { labels: { maxWidth: 180, style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, strokeDashArray: 4, padding: { right: 24 } },
            legend: { show: false },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Şöbə × ay istilik xəritəsi ───────────────────────────────────────────

    async renderSectionHeatmap(
        elementId: string,
        series: { name: string; data: { x: string; y: number }[] }[]
    ): Promise<void> {
        if (!this.isBrowser) { return; }
        const c = chartColors();
        await this.render(elementId, {
            series,
            chart: {
                type: 'heatmap',
                height: Math.max(260, series.length * 42 + 80),
                toolbar: { show: false },
                fontFamily: 'inherit'
            },
            dataLabels: { enabled: false },
            plotOptions: {
                heatmap: {
                    radius: 4,
                    enableShades: false,
                    // Uyğunsuzluq sayı: çox olduqca status ağırlaşır
                    colorScale: {
                        ranges: [
                            { from: 0, to: 0, color: c.surfaceSubtle, name: 'yoxdur' },
                            { from: 1, to: 3, color: c.successSoft, name: '1–3' },
                            { from: 4, to: 8, color: c.warningSoft, name: '4–8' },
                            { from: 9, to: 15, color: c.dangerSoft, name: '9–15' },
                            { from: 16, to: 999999, color: c.danger, name: '16+' }
                        ]
                    }
                }
            },
            stroke: { width: 3, colors: [c.surface] },
            xaxis: {
                type: 'category',
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' } }
            },
            yaxis: { labels: { style: { colors: c.textMuted, fontSize: '12px' } } },
            legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', labels: { colors: c.text } },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Risk matrisi (bubble): say × uyğunluq × açıq uyğunsuzluq ─────────────

    async renderRiskMatrix(
        elementId: string,
        series: { name: string; tone: RiskTone; data: { x: number; y: number; z: number; label: string }[] }[]
    ): Promise<void> {
        if (!this.isBrowser) { return; }
        const c = chartColors();
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
            colors: series.map(s => c[s.tone]),
            fill: { opacity: 0.75 },
            stroke: { width: 2, colors: [c.surface] },
            dataLabels: { enabled: false },
            plotOptions: { bubble: { minBubbleRadius: 6, maxBubbleRadius: 34 } },
            xaxis: {
                title: { text: 'Yoxlama sayı', style: { color: c.textMuted, fontWeight: 500 } },
                min: 0,
                max: xMax,
                tickAmount: Math.min(6, xMax),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: c.textMuted },
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
                title: { text: 'Uyğunluq (%)', style: { color: c.textMuted, fontWeight: 500 } },
                labels: {
                    style: { colors: c.textMuted },
                    formatter: (val: number) => (val < 0 || val > 100 ? '' : `${Math.round(val)}%`)
                }
            },
            grid: {
                borderColor: c.border,
                strokeDashArray: 4,
                // 0% və ya maksimum nöqtədəki kürələr sahədən kənara çıxmasın
                padding: { top: 12, right: 28, bottom: 12, left: 12 }
            },
            legend: { position: 'top', horizontalAlign: 'right', labels: { colors: c.text }, markers: { radius: 4 } },
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
        if (!this.isBrowser) { return; }
        const c = chartColors();
        await this.render(elementId, {
            series: [{ name: 'Plan', data: values }],
            chart: { type: 'bar', height: 280, toolbar: { show: false }, fontFamily: 'inherit' },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '62%',
                    borderRadius: 4,
                    dataLabels: { position: 'center' }
                }
            },
            // Tək ölçü (say) — mərhələlər uzunluqla müqayisə olunur, rənglə yox
            colors: [c.accent],
            dataLabels: {
                enabled: true,
                style: { fontSize: '12px', fontWeight: 600, colors: [c.surface] }
            },
            xaxis: {
                categories: labels,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' } }
            },
            yaxis: { labels: { style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, strokeDashArray: 4, xaxis: { lines: { show: true } } },
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

import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MONTH_SHORT_LABELS } from './dashboard.model';
import { chartColors, loadApexCharts } from '../../shared/utils/chart-colors';
import { integerAxis, integerLabel } from '../../shared/utils/chart-axis';

/** Risk zonasının qrafik rəngi — `ChartColors`-dakı status açarı */
export type RiskTone = 'success' | 'warning' | 'danger';

/** Aylıq dinamikanın iki qrafiki hover-də birlikdə hərəkət edir */
const TREND_GROUP = 'dash-trend';
/** Sinxron qrafiklərin sol oxu eyni enlikdə olmalıdır, yoxsa aylar üst-üstə düşmür */
const TREND_AXIS_WIDTH = 44;

/**
 * Dashboard qrafikləri. ApexCharts `loadApexCharts()` ilə dinamik yüklənir —
 * səhifə açılmayana qədər paketə düşmür. Admin panelindəki `DashboardChartsService`
 * ayrıca qalır: orada sabit element ID-ləri var, burada isə element
 * referansı ötürülür.
 *
 * Rəng varlığa bağlıdır (`chartColors().series`): yoxlama 1, uyğunsuzluq 2,
 * uyğunluq faizi 3. Risk zonası isə status rəngidir.
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
        const c = chartColors();
        await this.render(elementId, {
            series: [{ data }],
            chart: { type: 'area', height: 44, sparkline: { enabled: true } },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'solid', opacity: 0.1 },
            colors: [c.series[0]],
            tooltip: { enabled: false }
        });
    }

    // ── Aylıq dinamika: say (sütun) və uyğunluq faizi (xətt) ayrı qrafikdə ───
    //  İki fərqli şkala bir qrafikdə iki oxla göstərilmir: oxların nisbəti
    //  təsadüfidir və olmayan əlaqə göstərir. Qrafiklər hover-də sinxrondur.

    async renderTrend(
        countsId: string,
        complianceId: string,
        inspections: number[],
        findings: number[],
        compliance: (number | null)[]
    ): Promise<void> {
        const c = chartColors();
        const xaxis = {
            categories: MONTH_SHORT_LABELS,
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false },
            // Hover-də ayın zolağı açıq neytral olur (kitabxananın göyümtül rəngi yox)
            crosshairs: { fill: { type: 'solid', color: c.surfaceSubtle }, opacity: 0.6 },
            labels: { style: { colors: c.textMuted, fontSize: '12px' } }
        };
        const grid = { borderColor: c.border, padding: { left: 4, right: 8 } };

        // 0 sütun çəkilmir: yuvarlaq künc sıfırda da kiçik rəngli cizgi qoyur
        const bars = (values: number[]) => values.map(v => (v > 0 ? v : null));
        await this.render(countsId, {
            series: [
                { name: 'Yoxlama', data: bars(inspections) },
                { name: 'Uyğunsuzluq', data: bars(findings) }
            ],
            chart: { id: 'dash-trend-counts', group: TREND_GROUP, type: 'bar', height: 260 },
            colors: [c.series[0], c.series[1]],
            plotOptions: { bar: { columnWidth: '56%', borderRadius: 4, borderRadiusApplication: 'end' } },
            // Qonşu sütunlar arasında 2px fon boşluğu
            stroke: { show: true, width: 2, colors: ['transparent'] },
            dataLabels: { enabled: false },
            xaxis,
            yaxis: {
                ...integerAxis(Math.max(...inspections, ...findings)),
                labels: { minWidth: TREND_AXIS_WIDTH, maxWidth: TREND_AXIS_WIDTH, style: { colors: c.textMuted, fontSize: '12px' }, formatter: integerLabel }
            },
            grid,
            legend: {
                position: 'top', horizontalAlign: 'left', fontSize: '13px',
                labels: { colors: c.text }, markers: { size: 6, shape: 'square' }, itemMargin: { horizontal: 12 }
            },
            tooltip: { shared: true, intersect: false, y: { formatter: (val: number | null) => String(val ?? 0) } }
        });

        await this.render(complianceId, {
            series: [{ name: 'Uyğunluq', data: compliance }],
            chart: { id: 'dash-trend-compliance', group: TREND_GROUP, type: 'line', height: 170 },
            colors: [c.series[2]],
            stroke: { width: 2, curve: 'straight' },
            markers: { size: 5, strokeWidth: 2, strokeColors: c.surface, hover: { size: 7 } },
            dataLabels: { enabled: false },
            // Xətt nöqtələri də ayın ortasında olsun: yuxarıdakı sütunlarla üst-üstə düşür
            xaxis: { ...xaxis, tickPlacement: 'between' },
            yaxis: {
                min: 0, max: 100, tickAmount: 2,
                labels: { minWidth: TREND_AXIS_WIDTH, maxWidth: TREND_AXIS_WIDTH, style: { colors: c.textMuted, fontSize: '12px' }, formatter: (val: number) => `${Math.round(val)}%` }
            },
            grid,
            legend: { show: false },
            tooltip: {
                y: { formatter: (val: number | null) => (val == null ? 'yoxlama yoxdur' : `${val}%`) }
            }
        });
    }

    // ── Şöbələr üzrə uyğunluq: cari dövr vs əvvəlki (üfüqi sütunlar) ─────────

    async renderSectionBars(
        elementId: string,
        sections: string[],
        current: number[],
        previous: number[]
    ): Promise<void> {
        const c = chartColors();
        await this.render(elementId, {
            series: [
                { name: 'Cari dövr', data: current },
                { name: 'Əvvəlki dövr', data: previous }
            ],
            chart: { type: 'bar', height: 340 },
            // Eyni ölçü, iki dövr: eyni rəngin tam və açıq variantı
            colors: [c.series[0], c.seriesSoft],
            // Yazı sütunun sonundan kənarda: sütunun üstünə düşəndə oxunmur
            plotOptions: { bar: { horizontal: true, barHeight: '70%', borderRadius: 4, borderRadiusApplication: 'end', dataLabels: { position: 'top' } } },
            stroke: { show: true, width: 2, colors: ['transparent'] },
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
                tickAmount: 4,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: c.textMuted, fontSize: '12px' },
                    formatter: (val: string) => `${Math.round(Number(val))}%`
                }
            },
            yaxis: { labels: { maxWidth: 180, style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, padding: { right: 28 } },
            legend: {
                position: 'top', horizontalAlign: 'left', fontSize: '13px',
                labels: { colors: c.text }, markers: { size: 6, shape: 'square' }, itemMargin: { horizontal: 12 }
            },
            tooltip: { shared: true, intersect: false, y: { formatter: (val: number) => `${val}%` } }
        });
    }

    // ── Uyğunsuzluq kateqoriyaları: say üzrə sıralanmış üfüqi sütunlar ───────

    async renderCategoryBars(elementId: string, items: { name: string; value: number }[]): Promise<void> {
        const c = chartColors();
        // Ən uzun sütunun yazısı üçün ehtiyat yer
        const axis = integerAxis(Math.max(1, ...items.map(i => i.value)) * 1.15);
        await this.render(elementId, {
            series: [{ name: 'Uyğunsuzluq', data: items.map(i => i.value) }],
            chart: { type: 'bar', height: 340 },
            // Uyğunsuzluq hər qrafikdə eyni rəngdədir (seriya 2); müqayisə uzunluqladır
            colors: [c.series[1]],
            plotOptions: { bar: { horizontal: true, barHeight: '58%', borderRadius: 4, borderRadiusApplication: 'end', dataLabels: { position: 'top' } } },
            dataLabels: {
                enabled: true,
                offsetX: 22,
                style: { fontSize: '12px', fontWeight: 600, colors: [c.text] }
            },
            xaxis: {
                categories: items.map(i => i.name),
                ...axis,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' }, formatter: integerLabel }
            },
            yaxis: { labels: { maxWidth: 180, style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, padding: { right: 24 } },
            legend: { show: false },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Şöbə × ay istilik xəritəsi ───────────────────────────────────────────

    async renderSectionHeatmap(
        elementId: string,
        series: { name: string; data: { x: string; y: number }[] }[]
    ): Promise<void> {
        const c = chartColors();
        await this.render(elementId, {
            series,
            chart: { type: 'heatmap', height: Math.max(260, series.length * 42 + 80) },
            dataLabels: { enabled: false },
            plotOptions: {
                heatmap: {
                    radius: 4,
                    enableShades: false,
                    // Uyğunsuzluq sayı: bir rəngin (seriya 2) açıqdan tündə şkalası
                    colorScale: {
                        ranges: [
                            { from: 0, to: 0, color: c.surfaceSubtle, name: 'yoxdur' },
                            { from: 1, to: 3, color: c.heat[0], name: '1–3' },
                            { from: 4, to: 8, color: c.heat[1], name: '4–8' },
                            { from: 9, to: 15, color: c.heat[2], name: '9–15' },
                            { from: 16, to: 999999, color: c.heat[3], name: '16+' }
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
            legend: {
                position: 'top', horizontalAlign: 'left', fontSize: '12px',
                labels: { colors: c.text }, markers: { size: 6, shape: 'square' }, itemMargin: { horizontal: 8 }
            },
            tooltip: { y: { formatter: (val: number) => `${val} uyğunsuzluq` } }
        });
    }

    // ── Risk matrisi (bubble): say × uyğunluq × açıq uyğunsuzluq ─────────────

    async renderRiskMatrix(
        elementId: string,
        series: { name: string; tone: RiskTone; data: { x: number; y: number; z: number; label: string }[] }[]
    ): Promise<void> {
        const c = chartColors();
        // Ox son həddində qalan kürə yarıya qədər kəsilir — ona görə oxa
        // ehtiyat sahə verilir, qrafik sahəsi isə `grid.padding` ilə daraldılır.
        const xValues = series.flatMap(s => s.data.map(p => p.x));
        const maxX = Math.max(1, ...xValues);
        const xMax = maxX + Math.max(1, Math.ceil(maxX * 0.2));

        await this.render(elementId, {
            series: series.map(s => ({ name: s.name, data: s.data })),
            chart: { type: 'bubble', height: 360, zoom: { enabled: false } },
            colors: series.map(s => c[s.tone]),
            fill: { opacity: 0.8 },
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
                labels: { style: { colors: c.textMuted }, formatter: integerLabel }
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
                // 0% və ya maksimum nöqtədəki kürələr sahədən kənara çıxmasın
                padding: { top: 12, right: 28, bottom: 12, left: 12 }
            },
            legend: {
                position: 'top', horizontalAlign: 'left', fontSize: '13px',
                labels: { colors: c.text }, markers: { size: 6, shape: 'circle' }, itemMargin: { horizontal: 12 }
            },
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
        const c = chartColors();
        await this.render(elementId, {
            series: [{ name: 'Plan', data: values }],
            chart: { type: 'bar', height: 280 },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '62%',
                    borderRadius: 4,
                    borderRadiusApplication: 'end',
                    dataLabels: { position: 'top' }
                }
            },
            // Tək ölçü (say) — mərhələlər uzunluqla müqayisə olunur, rənglə yox
            colors: [c.series[0]],
            // Yazı sütunun sonundan kənarda: qısa sütunun içinə sığmır
            dataLabels: {
                enabled: true,
                offsetX: 22,
                style: { fontSize: '12px', fontWeight: 600, colors: [c.text] }
            },
            xaxis: {
                categories: labels,
                ...integerAxis(Math.max(1, ...values) * 1.15),
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: c.textMuted, fontSize: '12px' }, formatter: integerLabel }
            },
            yaxis: { labels: { maxWidth: 180, style: { colors: c.textMuted, fontSize: '12px' } } },
            grid: { borderColor: c.border, padding: { right: 24 } },
            legend: { show: false },
            tooltip: { y: { formatter: (val: number) => `${val} plan` } }
        });
    }

    // ── Ortaq render ─────────────────────────────────────────────────────────

    private async render(elementId: string, options: any): Promise<void> {
        if (!this.isBrowser) { return; }

        const element = document.querySelector(`#${elementId}`);
        if (!element) { return; }

        const ApexCharts = await loadApexCharts();
        const chart = new ApexCharts(element, options);
        await chart.render();
        this.charts.push(chart);
    }
}

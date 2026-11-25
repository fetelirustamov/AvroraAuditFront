import { Injectable, OnDestroy } from '@angular/core';

import { chartColors, loadApexCharts } from '../../../../shared/utils/chart-colors';

export interface TrendPoint {
    /** X oxundakı etiket (yoxlama tarixi) */
    label: string;
    /** Yoxlama nəticəsi, faiz */
    result: number;
    solved: number;
    open: number;
}

/**
 * Mağaza profilindəki yoxlama dinamikası. Faiz və say eyni oxda göstərilmir:
 * nəticə faizi ayrıca xətt qrafikidir, uyğunsuzluqlar ayrıca sütun qrafikidir.
 *
 * Komponentdə `providers` ilə verilir: hər profil öz qrafiklərini yaradır və
 * komponentlə birlikdə sökür (köhnə mağazanın qrafiki ekranda qalmır).
 * ApexCharts dinamik `import()` ilə yüklənir.
 */
@Injectable()
export class InspectionTrendChartService implements OnDestroy {
    private charts: { destroy(): void }[] = [];
    /** Hər render bir nəsildir: gecikən `import()` köhnə məlumatla qrafik yaratmasın */
    private generation = 0;

    async render(resultHost: HTMLElement, countHost: HTMLElement, points: TrendPoint[]): Promise<void> {
        this.destroy();
        const generation = this.generation;
        if (!points.length) { return; }

        const ApexCharts = await loadApexCharts();
        if (generation !== this.generation) { return; }

        const c = chartColors();
        const categories = points.map(p => p.label);
        const axisLabels = { style: { colors: c.textMuted, fontSize: '12px' } };
        const base = {
            chart: { height: 260, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
            grid: { borderColor: c.border, strokeDashArray: 3 },
            dataLabels: { enabled: false },
            xaxis: {
                categories,
                axisTicks: { show: false },
                axisBorder: { color: c.border },
                labels: axisLabels,
            },
        };

        const result = new ApexCharts(resultHost, {
            ...base,
            chart: { ...base.chart, type: 'line' },
            series: [{ name: 'Nəticə', data: points.map(p => Math.round(p.result * 10) / 10) }],
            // Nəticə uyğunluq faizidir: dashboard-dakı uyğunluq xətti ilə eyni rəng
            colors: [c.series[2]],
            stroke: { width: 2, curve: 'straight' },
            markers: { size: 4, strokeColors: c.surface, strokeWidth: 2 },
            yaxis: { min: 0, max: 100, tickAmount: 4, labels: { ...axisLabels, formatter: (v: number) => `${Math.round(v)}%` } },
            tooltip: { y: { formatter: (v: number) => `${v}%` } },
            legend: { show: false },
        });

        const counts = new ApexCharts(countHost, {
            ...base,
            chart: { ...base.chart, type: 'bar' },
            series: [
                { name: 'Həll edilmiş', data: points.map(p => p.solved) },
                { name: 'Açıq', data: points.map(p => p.open) },
            ],
            // Həll edilmiş / açıq vəziyyətdir: rəng statusdan, ad legend-dən gəlir
            colors: [c.success, c.danger],
            plotOptions: { bar: { columnWidth: '50%', borderRadius: 4, borderRadiusApplication: 'end' } },
            stroke: { show: true, width: 2, colors: ['transparent'] },
            yaxis: { min: 0, forceNiceScale: true, labels: { ...axisLabels, formatter: (v: number) => String(Math.round(v)) } },
            legend: { show: true, position: 'top', horizontalAlign: 'left', fontSize: '12px', labels: { colors: c.text } },
            tooltip: { shared: true, intersect: false },
        });

        this.charts = [result, counts];
        await Promise.all([result.render(), counts.render()]);
    }

    destroy(): void {
        this.generation++;
        this.charts.forEach(chart => {
            try { chart.destroy(); } catch { /* artıq sökülüb */ }
        });
        this.charts = [];
    }

    ngOnDestroy(): void {
        this.destroy();
    }
}

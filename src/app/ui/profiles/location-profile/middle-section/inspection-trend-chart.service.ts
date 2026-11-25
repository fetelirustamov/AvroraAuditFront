import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { chartColors } from '../../../../shared/utils/chart-colors';

/** Qrafikin render olunduğu element */
export const INSPECTION_TREND_CHART_ID = 'location_inspection_trend_chart';

/**
 * Ərazi profilindəki yoxlama dinamikası qrafiki (sütun diaqramı).
 *
 * Əvvəl bu məntiq şablonun demo səhifəsindən (`pages/ecommerce-page/
 * e-seller-details/revenue/revenue.service.ts`) idxal olunurdu — real səhifə
 * silinməli demo koda bağlı qalırdı. Servis buraya köçürüldü, DOM id-si
 * `ep_revenue_chart`-dan mənalı ada dəyişdirildi və rənglər tema
 * dəyişənlərindən oxunur.
 */
@Injectable({ providedIn: 'root' })
export class InspectionTrendChartService {

    private isBrowser: boolean;
    private chart: any;

    constructor(@Inject(PLATFORM_ID) private platformId: any) {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    async loadChart(series: { name: string; data: number[] }[], categories: string[]): Promise<void> {
        if (!this.isBrowser) {
            return;
        }
        const host = document.querySelector(`#${INSPECTION_TREND_CHART_ID}`);
        if (!host) {
            return;
        }
        try {
            const ApexCharts = (await import('apexcharts')).default;
            const c = chartColors();
            const border = c.border;
            const label = c.textMuted;

            this.chart = new ApexCharts(host, {
                series,
                chart: { type: 'bar', height: 430, toolbar: { show: true }, fontFamily: 'inherit' },
                // Seriya sırası: Nəticə % (əsas → vurğu), Ümumi (neytral), Həll (success), Açıq (danger)
                colors: [c.accent, c.neutral[2], c.success, c.danger],
                plotOptions: { bar: { columnWidth: '50%' } },
                grid: { show: true, borderColor: border },
                dataLabels: { enabled: false },
                stroke: { width: 5, show: true, colors: ['transparent'] },
                xaxis: {
                    categories,
                    axisTicks: { show: false, color: border },
                    axisBorder: { show: false, color: border },
                    labels: { show: true, style: { colors: label, fontSize: '12px' } },
                },
                yaxis: {
                    min: 0,
                    labels: { style: { colors: label, fontSize: '12px' } },
                    axisBorder: { show: false, color: border },
                    axisTicks: { show: false, color: border },
                },
                legend: {
                    show: true,
                    position: 'top',
                    fontSize: '12px',
                    horizontalAlign: 'left',
                    itemMargin: { horizontal: 8, vertical: 0 },
                    labels: { colors: label },
                    markers: { size: 7, offsetX: -2, offsetY: -.5, shape: 'diamond' },
                },
            });
            this.chart.render();
        } catch (error) {
            console.error('Yoxlama dinamikası qrafiki yüklənmədi:', error);
        }
    }

    updateChart(series: { name: string; data: number[] }[], categories: string[]): void {
        this.chart?.updateOptions({ series, xaxis: { categories } });
    }
}

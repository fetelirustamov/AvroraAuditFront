import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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

    /** Tema dəyişənindən rəng oxu, dəyər yoxdursa ehtiyat rəngə keç */
    private token(name: string, fallback: string): string {
        if (!this.isBrowser) return fallback;
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
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
            const border = this.token('--borderColor', '#ECEEF2');
            const label = this.token('--bodyColor', '#64748B');

            this.chart = new ApexCharts(host, {
                series,
                chart: { type: 'bar', height: 430, toolbar: { show: true } },
                colors: [
                    this.token('--primaryColor', '#605DFF'),
                    this.token('--secondaryColor', '#3584FC'),
                    this.token('--successColor', '#25B003'),
                    this.token('--dangerColor', '#FF4023'),
                ],
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

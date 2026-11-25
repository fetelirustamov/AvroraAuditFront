/**
 * Say oxu: yalnız tam ədəd nişanları (1, 2, 5, 10, 20 … addımla).
 * ApexCharts `max`/`tickAmount` uyğun gəlməyəndə 1.6, 3.2 kimi nişanlar verir
 * və yuvarlaqlaşdırma onları təkrarlayır (2, 3, 3, 5). Burada addım əvvəlcədən
 * seçilir, ona görə hər nişan tam ədəddir.
 */
export function integerAxis(maxValue: number, maxTicks = 5): { min: number; max: number; tickAmount: number } {
    const top = Math.max(1, Math.ceil(maxValue));
    const rough = top / maxTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(1, rough))));
    const step = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= rough) ?? 10 * magnitude;
    const max = Math.ceil(top / step) * step;
    return { min: 0, max, tickAmount: max / step };
}

export const integerLabel = (val: number | string): string => String(Math.round(Number(val)));

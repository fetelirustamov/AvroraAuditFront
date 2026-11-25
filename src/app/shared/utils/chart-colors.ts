/**
 * Qrafik rəngləri `_tokens.scss`-dəki CSS dəyişənlərindən oxunur.
 *
 * ApexCharts kimi kitabxanalar `var(--…)` qəbul etmir (çalarları özü hesablayır),
 * ona görə dəyər render anında `:root`-dan götürülür. DOM elementinin `style`-ına
 * yazılan rənglər üçün bu helper lazım deyil, birbaşa `var(--…)` yaz.
 *
 * Qayda:
 * - seriyanın kimliyi → `series` (sabit sıra, rəng varlığa bağlıdır):
 *   `series[0]` yoxlama/əsas ölçü, `series[1]` uyğunsuzluq, `series[2]` uyğunluq faizi;
 * - vəziyyət (həll edilmiş/açıq, risk zonası) → `success`, `warning`, `danger`;
 * - uyğunsuzluq sıxlığı → `heat` şkalası.
 * Mətn həmişə mətn token-indədir, seriya rəngində yox.
 */
export interface ChartColors {
    /** Kateqoriya rəngləri, sabit sıra ilə (`--chart-1` … `--chart-6`) */
    series: string[];
    /** `series[0]`-ın açıq variantı: eyni ölçünün əvvəlki dövrü */
    seriesSoft: string;
    /** Uyğunsuzluq sıxlığı, açıqdan tündə */
    heat: string[];

    success: string;
    warning: string;
    danger: string;

    textStrong: string;
    text: string;
    textMuted: string;
    /** Ox xətləri, grid */
    border: string;
    surface: string;
    surfaceSubtle: string;
}

function token(styles: CSSStyleDeclaration, name: string): string {
    return styles.getPropertyValue(name).trim();
}

/** Brauzerdə çağır (render vaxtı): token-lərin cari dəyərlərini qaytarır. */
export function chartColors(): ChartColors {
    const s = getComputedStyle(document.documentElement);
    return {
        series: [1, 2, 3, 4, 5, 6].map(i => token(s, `--chart-${i}`)),
        seriesSoft: token(s, '--chart-1-soft'),
        heat: [1, 2, 3, 4].map(i => token(s, `--chart-heat-${i}`)),

        success: token(s, '--success'),
        warning: token(s, '--warning'),
        danger: token(s, '--danger'),

        textStrong: token(s, '--text-strong'),
        text: token(s, '--text'),
        textMuted: token(s, '--text-muted'),
        border: token(s, '--border'),
        surface: token(s, '--surface'),
        surfaceSubtle: token(s, '--surface-subtle'),
    };
}

let apexLoad: Promise<any> | undefined;

/**
 * ApexCharts-ı dinamik yükləyir və ortaq defaultları bir dəfə qoyur.
 * Hər qrafik bunu işlətməlidir, `import('apexcharts')`-i birbaşa çağırma.
 *
 * Hover/aktiv filtri söndürülür: kitabxananın `lighten`-i parlaqlığı 2 dəfə
 * artırır (sütun ağarıb itir), `darken`-i 0.3-ə salır (qaralır). Hover
 * işarəsini `styles.scss`-dəki yüngül CSS filtri verir.
 */
export function loadApexCharts(): Promise<any> {
    apexLoad ??= import('apexcharts').then(module => {
        (window as any).Apex = {
            chart: { fontFamily: 'inherit', toolbar: { show: false } },
            states: {
                hover: { filter: { type: 'none' } },
                active: { filter: { type: 'none' } }
            }
        };
        return module.default;
    });
    return apexLoad;
}

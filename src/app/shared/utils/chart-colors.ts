/**
 * Qrafik rəngləri `_tokens.scss`-dəki CSS dəyişənlərindən oxunur.
 *
 * ApexCharts kimi kitabxanalar `var(--…)` qəbul etmir (çalarları özü hesablayır),
 * ona görə dəyər render anında `:root`-dan götürülür. DOM elementinin `style`-ına
 * yazılan rənglər üçün bu helper lazım deyil, birbaşa `var(--…)` yaz.
 *
 * Qayda: mənası olmayan seriya → `accent` və ya `neutral`; status/risk → `success`,
 * `warning`, `danger`, `info`. Mətn həmişə mətn token-indədir, seriya rəngində yox.
 */
export interface ChartColors {
    accent: string;
    accentSoft: string;

    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    info: string;
    infoSoft: string;

    textStrong: string;
    text: string;
    textMuted: string;
    /** Ox xətləri, grid, radial trek */
    border: string;
    surface: string;
    surfaceMuted: string;
    surfaceSubtle: string;

    /** Mənasız kateqoriyalar üçün neytral şkala, tündən açığa, sabit sıra ilə */
    neutral: string[];
}

function token(styles: CSSStyleDeclaration, name: string): string {
    return styles.getPropertyValue(name).trim();
}

/** Brauzerdə çağır (render vaxtı): token-lərin cari dəyərlərini qaytarır. */
export function chartColors(): ChartColors {
    const s = getComputedStyle(document.documentElement);
    return {
        accent: token(s, '--accent'),
        accentSoft: token(s, '--accent-soft'),

        success: token(s, '--success'),
        successSoft: token(s, '--success-soft'),
        warning: token(s, '--warning'),
        warningSoft: token(s, '--warning-soft'),
        danger: token(s, '--danger'),
        dangerSoft: token(s, '--danger-soft'),
        info: token(s, '--info'),
        infoSoft: token(s, '--info-soft'),

        textStrong: token(s, '--text-strong'),
        text: token(s, '--text'),
        textMuted: token(s, '--text-muted'),
        border: token(s, '--border'),
        surface: token(s, '--surface'),
        surfaceMuted: token(s, '--surface-muted'),
        surfaceSubtle: token(s, '--surface-subtle'),

        neutral: ['--gray-700', '--gray-500', '--gray-400', '--gray-300'].map(name => token(s, name)),
    };
}

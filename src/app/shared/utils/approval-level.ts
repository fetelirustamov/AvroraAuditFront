/**
 * Onay zəncirinin (Structures.Level) səviyyəsinə görə rol adı:
 * 1-ci onay = Mağaza müdiri, 2-ci = Satış müdiri, 3-cü = Direktor.
 * Ad istifadəçinin roleName-indən yox, zəncirdəki mərtəbədən gəlir.
 */
export const ROLE_BY_LEVEL: Record<number, string> = {
    1: 'Mağaza müdiri',
    2: 'Satış müdiri',
    3: 'Direktor',
};

export function levelRoleLabel(level: number): string {
    return ROLE_BY_LEVEL[level] ?? `Səviyyə ${level}`;
}

/**
 * Plan və uyğunsuzluq statuslarının etiket və tonlarının vahid mənbəyi.
 *
 * Etiket statusu "növbə kimdədir" formasında deyir (bax `docs/design/glossary.md`):
 * "Baş müfəttişin təsdiqində", "Müfəttiş onaylayıb" yox. Ton rəngin mənasıdır:
 * gözləyir → warning, icrada → info, yekun → success, rədd → danger, qalanı neytral.
 */

/** Status rənginin mənası. `.status-chip.is-*` və status token-lərinə (`--success` və s.) uyğundur. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusMeta {
    label: string;
    tone: StatusTone;
}

/**
 * `InspectionPlans.Status` (backend-dəki `Statuses` enum-u köhnəlib, ona güvənmə):
 * 1 → planlanıb, təsdiq gözləyir; 2 → təsdiqlənib, mobilə gedir; 3 → mobil yoxlamanı bitirib,
 * yoxlama təsdiqi gözləyir; 4 → yekunlaşıb; 5 → vaxtı bitib; -1 → rədd edilib.
 */
export const PLAN_STATUS_META: Readonly<Record<number, StatusMeta>> = {
    1: { label: 'Təsdiq gözləyir', tone: 'warning' },
    2: { label: 'Təsdiqlənib', tone: 'info' },
    3: { label: 'Yoxlama təsdiq gözləyir', tone: 'warning' },
    4: { label: 'Yekunlaşıb', tone: 'success' },
    5: { label: 'Vaxtı bitib', tone: 'neutral' },
    [-1]: { label: 'Rədd edilib', tone: 'danger' },
};

/**
 * `Disruptions.Status`: 0 → müfəttişin təsdiqində, 1 → baş müfəttişin təsdiqində,
 * 2 → təsdiqlənib (mağazaya gedir), -1 → rədd edilib.
 * Mağaza/zəncir mərhələləri izləmə ekranının `STAGE_META`-sındadır.
 */
export const DISRUPTION_STATUS_META: Readonly<Record<number, StatusMeta>> = {
    0: { label: 'Müfəttişin təsdiqində', tone: 'warning' },
    1: { label: 'Baş müfəttişin təsdiqində', tone: 'warning' },
    2: { label: 'Təsdiqlənib', tone: 'success' },
    [-1]: { label: 'Rədd edilib', tone: 'danger' },
};

/** Plan statusunun yalnız etiketləri (filtr seçimləri, qrafik legendası üçün). */
export const PLAN_STATUS_LABELS: Readonly<Record<number, string>> = Object.fromEntries(
    Object.entries(PLAN_STATUS_META).map(([code, meta]) => [code, meta.label]),
);

const EMPTY_META: StatusMeta = { label: '—', tone: 'neutral' };

function lookup(table: Readonly<Record<number, StatusMeta>>, status: number | null | undefined): StatusMeta {
    if (status == null) return EMPTY_META;
    return table[status] ?? { label: `Status ${status}`, tone: 'neutral' };
}

/** Plan statusunun etiketi və tonu. `null` → "—", naməlum kod → "Status N" (neytral). */
export function planStatusMeta(status: number | null | undefined): StatusMeta {
    return lookup(PLAN_STATUS_META, status);
}

/** Uyğunsuzluq statusunun etiketi və tonu. `null` → "—", naməlum kod → "Status N" (neytral). */
export function disruptionStatusMeta(status: number | null | undefined): StatusMeta {
    return lookup(DISRUPTION_STATUS_META, status);
}

/** Plan statusunun etiketi. */
export function planStatusLabel(status: number | null | undefined): string {
    return planStatusMeta(status).label;
}

/** Uyğunsuzluq statusunun etiketi. */
export function disruptionStatusLabel(status: number | null | undefined): string {
    return disruptionStatusMeta(status).label;
}

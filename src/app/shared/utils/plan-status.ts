/**
 * InspectionPlans.Status-un real mənası (backend-dəki Statuses enum-u köhnəlib, ona güvənmə):
 * 1 → planlanıb, təsdiq gözləyir; 2 → təsdiqlənib, mobilə gedir; 3 → mobil yoxlamanı bitirib,
 * yoxlama təsdiqi gözləyir; 4 → yekunlaşıb; 5 → vaxtı bitib; -1 → rədd edilib.
 */
export const PLAN_STATUS_LABELS: Record<number, string> = {
    1: 'Təsdiq gözləyir',
    2: 'Təsdiqlənib',
    3: 'Yoxlanılıb',
    4: 'Yekunlaşıb',
    5: 'Vaxtı bitib',
    [-1]: 'Rədd edilib',
};

export function planStatusLabel(status: number | null | undefined): string {
    return status == null ? '—' : PLAN_STATUS_LABELS[status] ?? `Status ${status}`;
}

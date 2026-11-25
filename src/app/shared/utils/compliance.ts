/** Checklist uyğunluq faizinin həddləri — dashboard risk zonaları ilə eynidir. */
export const COMPLIANCE_GOOD = 85;
export const COMPLIANCE_FAIR = 70;

export type ComplianceTone = 'success' | 'warning' | 'danger';

export function complianceTone(percent: number): ComplianceTone {
    if (percent >= COMPLIANCE_GOOD) return 'success';
    if (percent >= COMPLIANCE_FAIR) return 'warning';
    return 'danger';
}

/** Çəkili faiz: Σ faktiki / Σ normativ × 100. Normativi 0 olan sətirlər hesaba qatılmır. */
export function weightedPercent<T>(rows: T[], scoreKey: keyof T, normKey: keyof T): number | null {
    let score = 0;
    let norm = 0;
    for (const r of rows) {
        const n = Number(r[normKey]);
        if (!(n > 0)) { continue; }
        norm += n;
        score += Number(r[scoreKey]) || 0;
    }
    return norm > 0 ? (score / norm) * 100 : null;
}

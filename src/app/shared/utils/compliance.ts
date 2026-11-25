/** Checklist uyğunluq faizinin həddləri — dashboard risk zonaları ilə eynidir. */
export const COMPLIANCE_GOOD = 85;
export const COMPLIANCE_FAIR = 70;

export type ComplianceTone = 'success' | 'warning' | 'danger';

export function complianceTone(percent: number): ComplianceTone {
    if (percent >= COMPLIANCE_GOOD) return 'success';
    if (percent >= COMPLIANCE_FAIR) return 'warning';
    return 'danger';
}

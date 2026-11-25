import { Component } from '@angular/core';
import { COMPLIANCE_FAIR, COMPLIANCE_GOOD } from '../../utils/compliance';

/**
 * Uyğunluq faizinin rəng həddlərinin legend-i: rənglə göstərilən faizin yanında qoyulur ki,
 * istifadəçi rəngin nəyi bildirdiyini təxmin etməsin. Həddlər `compliance.ts`-dən gəlir.
 */
@Component({
    selector: 'app-compliance-legend',
    standalone: true,
    template: `
        <span class="legend" role="note" aria-label="Uyğunluq həddləri">
            @for (zone of zones; track zone.tone) {
                <span class="legend-item">
                    <span class="dot" [style.background]="'var(--' + zone.tone + ')'" aria-hidden="true"></span>{{ zone.label }}
                </span>
            }
        </span>
    `,
    styles: `
        .legend {
            display: inline-flex;
            flex-wrap: wrap;
            gap: 2px var(--space-3);
            font-size: var(--fs-12);
            color: var(--text-muted);
            font-variant-numeric: tabular-nums;
        }
        .legend-item {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
        }
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
    `
})
export class ComplianceLegendComponent {
    readonly zones = [
        { tone: 'success', label: `≥${COMPLIANCE_GOOD}%` },
        { tone: 'warning', label: `${COMPLIANCE_FAIR}–${COMPLIANCE_GOOD}%` },
        { tone: 'danger', label: `<${COMPLIANCE_FAIR}%` },
    ] as const;
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusMeta, StatusTone, disruptionStatusMeta, planStatusMeta } from './status-meta';

/**
 * Status nişanı. Rəng yalnız mənadır, mətn öz fonu üzərində 4.5:1 kontrast verir.
 *
 * Plan və uyğunsuzluq üçün kodu ver, etiket və ton `status-meta.ts`-dən gəlir.
 * Başqa statuslar üçün `tone` + `label` ver. Açıq `label`/`tone` koddan gələni əvəz edir.
 *
 * @example
 * <app-status-chip [planStatus]="row.status" />
 * <app-status-chip [disruptionStatus]="row.status" />
 * <app-status-chip tone="info" label="Mağazanın cavabında" icon="storefront" />
 */
@Component({
    selector: 'app-status-chip',
    standalone: true,
    template: `
        <span class="status-chip" [class]="'is-' + meta().tone">
            @if (icon()) {
                <span class="material-symbols-outlined status-chip-icon" aria-hidden="true">{{ icon() }}</span>
            }
            {{ meta().label }}
        </span>
    `,
    styleUrl: './status-chip.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChipComponent {
    /** Rəngin mənası. */
    readonly tone = input<StatusTone>();
    /** Nişan mətni. */
    readonly label = input<string>();
    /** Etiketdən əvvəl kiçik ikon (Material Symbols adı). */
    readonly icon = input<string>();
    /** `InspectionPlans.Status` kodu. */
    readonly planStatus = input<number | null>();
    /** `Disruptions.Status` kodu. */
    readonly disruptionStatus = input<number | null>();

    protected readonly meta = computed<StatusMeta>(() => {
        const base = this.planStatus() !== undefined
            ? planStatusMeta(this.planStatus())
            : this.disruptionStatus() !== undefined
                ? disruptionStatusMeta(this.disruptionStatus())
                : { label: '', tone: 'neutral' as StatusTone };
        return { label: this.label() ?? base.label, tone: this.tone() ?? base.tone };
    });
}

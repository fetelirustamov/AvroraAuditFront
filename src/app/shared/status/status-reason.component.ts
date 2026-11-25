import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AppDatePipe } from '../pipes/app-date.pipe';
import { StatusTone } from './status-meta';

/**
 * Səbəbi yazılmış son status dəyişikliyi (API `StatusChange`, cədvəl `StatusChangeLogs`).
 * Plan: `GET inspectionPlans/statusReason/{id}`, uyğunsuzluq: `GET disruptions/statusReasons?ids=`.
 */
export interface StatusChange {
    /** Plan və ya uyğunsuzluq ID-si. */
    refId: number;
    fromStatus: number | null;
    toStatus: number;
    reason: string;
    changedBy: number;
    changedByName: string | null;
    /** `datetimeoffset`, zona ilə gəlir. */
    changedDate: string;
}

export type StatusReasonSubject = 'plan' | 'disruption';

const REJECTED = -1;

/** Başlıq əməliyyatın adıdır (`STATUS_ACTIONS` fellərinə uyğun): kim niyə geri göndərdi. */
function reasonTitle(subject: StatusReasonSubject, change: StatusChange): string {
    if (change.toStatus === REJECTED) return 'Rədd səbəbi';
    if (subject === 'disruption') return change.toStatus === 0 ? 'Müfəttişə qaytarılma səbəbi' : 'Səbəb';
    if (change.toStatus === 2 && change.fromStatus === 4) return 'Yenidən açılma səbəbi';
    if (change.toStatus === 2 && change.fromStatus === 3) return 'Mobilə qaytarılma səbəbi';
    return 'Səbəb';
}

/**
 * Rədd və ya geri qaytarmanın səbəbi: geri göndərilən adam (müfəttiş, mağaza) niyəsini görür.
 * Son səbəbi göstərir, cari status başqa olsa da (tarix ilə): yoxlayan düzəlişi onunla tutuşdurur.
 *
 * @example
 * @if (reason) { <app-status-reason subject="plan" [change]="reason" /> }
 * <app-status-reason subject="disruption" [change]="row.reason" compact />
 */
@Component({
    selector: 'app-status-reason',
    standalone: true,
    imports: [AppDatePipe],
    template: `
        <aside class="status-reason" [class]="'is-' + tone()" [class.is-compact]="compact()" role="note"
               [attr.aria-label]="title()">
            <span class="material-symbols-outlined status-reason-icon" aria-hidden="true">{{ icon() }}</span>
            <div class="status-reason-body">
                <p class="status-reason-head">
                    <span class="status-reason-title">{{ title() }}</span>
                    <span class="status-reason-meta">
                        {{ change().changedDate | appDate:'datetime' }}
                        @if (change().changedByName; as name) {
                            <span aria-hidden="true">·</span> {{ name }}
                        }
                    </span>
                </p>
                <p class="status-reason-text">{{ change().reason }}</p>
            </div>
        </aside>
    `,
    styleUrl: './status-reason.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusReasonComponent {
    readonly change = input.required<StatusChange>();
    readonly subject = input.required<StatusReasonSubject>();
    /** Cədvəl sətri üçün: kiçik şrift, az boşluq. */
    readonly compact = input(false, { transform: (v: boolean | '') => v !== false });

    protected readonly title = computed(() => reasonTitle(this.subject(), this.change()));
    /** Rədd → danger, geri qaytarma → warning (yenidən iş gözləyir). */
    protected readonly tone = computed<StatusTone>(() => (this.change().toStatus === REJECTED ? 'danger' : 'warning'));
    protected readonly icon = computed(() => (this.change().toStatus === REJECTED ? 'block' : 'undo'));
}

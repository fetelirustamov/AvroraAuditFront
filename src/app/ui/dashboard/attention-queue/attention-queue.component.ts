import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, catchError, filter, forkJoin, map, of, switchMap, take } from 'rxjs';

import { PermissionService } from '../../../auth/permission.service';
import { DisruptionStageCount, StageCode } from '../../disruptions/disruption-tracking/disruption-tracking.model';
import { AttentionService } from './attention.service';

/** Növbədəki bir iş: say, nə olduğu və süzülmüş siyahıya keçid */
interface AttentionItem {
    key: string;
    label: string;
    icon: string;
    count: number;
    link: string;
    queryParams?: Record<string, string | number>;
    /** Gecikmə və geri qaytarma qırmızı, qalanı neytraldır: rəng yalnız məna daşıyır */
    tone: 'neutral' | 'danger';
}

/** Mənbə ya alınır (`count`), ya alınmır (`null`): uğursuz sorğu növbəni gizlətmir, qeyd olunur */
type Fetched<T> = Observable<T | null>;

const PLAN_PENDING = '1';
const INSPECTION_AWAITING_APPROVAL = '3';

/**
 * Əsas səhifənin başındakı iş növbəsi: istifadəçinin indi nə etməli olduğu.
 * Dövr filtrindən asılı deyil. Hər mənbə yalnız istifadəçinin həmin səhifəyə icazəsi varsa sorğulanır,
 * server isə sayı onun əhatəsinə salır (öz datası, öz firmaları; Admin hamısı).
 */
@Component({
    selector: 'app-attention-queue',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './attention-queue.component.html',
    styleUrl: './attention-queue.component.scss'
})
export class AttentionQueueComponent {
    private readonly permissions = inject(PermissionService);
    private readonly api = inject(AttentionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly items = signal<AttentionItem[]>([]);
    readonly loaded = signal(false);
    readonly partial = signal(false);
    /** İstifadəçinin heç bir növbə səhifəsinə icazəsi yoxdursa blok göstərilmir */
    readonly hasSources = signal(false);

    constructor() {
        // İcazələr girişdən sonra asinxron gəlir: hansı növbələrin sorğulanacağı onlardan asılıdır
        toObservable(this.permissions.loaded).pipe(
            filter(Boolean),
            take(1),
            switchMap(() => this.fetch()),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(({ items, partial, hasSources }) => {
            // Gecikən və qaytarılan işlər əvvəldə: ən təcili olanlar
            const urgent = (i: AttentionItem) => i.tone === 'danger' ? 0 : 1;
            this.items.set(items.filter(i => i.count > 0).sort((a, b) => urgent(a) - urgent(b)));
            this.partial.set(partial);
            this.hasSources.set(hasSources);
            this.loaded.set(true);
        });
    }

    private fetch(): Observable<{ items: AttentionItem[]; partial: boolean; hasSources: boolean }> {
        const can = (key: string) => this.permissions.canShow(key);
        const safe = <T>(source: Observable<T>): Fetched<T> => source.pipe(catchError(() => of(null)));
        const none: Fetched<never> = of(undefined as never);

        const sources = {
            answers: can('answers')
                ? safe(this.api.count('disruptionAnswers/disruptionAnswersByLocations', {
                    disruptionStatus: '2', disruptionAnswerStatus: '1', isAnswered: 'false', approveStatus: '0', isCurrent: 'true'
                }))
                : none,
            answerApprove: can('answer-approve')
                ? safe(this.api.count('disruptionAnswers/disruptionAnswerApprove', {
                    disruptionStatus: '2', disruptionAnswerStatus: '1', isCurrent: '1', isAnswered: 'true'
                }))
                : none,
            plans: can('plan-actions')
                ? safe(this.api.count('inspectionPlans/getDetails', { status: PLAN_PENDING }))
                : none,
            inspections: can('inspection-approve')
                ? safe(this.api.count('inspectionPlans/getDetails', { status: INSPECTION_AWAITING_APPROVAL }))
                : none,
            stages: can('disruption-tracking') ? safe(this.api.disruptionStages()) : none,
        };

        return forkJoin(sources).pipe(map(r => {
            const requested = Object.values(r).filter(v => v !== undefined);
            const partial = requested.some(v => v === null);
            const items: AttentionItem[] = [];
            const push = (item: AttentionItem | null) => { if (item) { items.push(item); } };

            push(r.answers == null ? null : {
                key: 'answers', label: 'Cavabınızı gözləyən yoxlamalar', icon: 'edit_note',
                count: r.answers, link: '/answers', tone: 'neutral'
            });
            push(r.answerApprove == null ? null : {
                key: 'answer-approve', label: 'Cavabı təsdiqinizi gözləyən yoxlamalar', icon: 'rule',
                count: r.answerApprove, link: '/answers/approve', tone: 'neutral'
            });
            push(r.plans == null ? null : {
                key: 'plans', label: 'Təsdiq gözləyən planlar', icon: 'event_available',
                count: r.plans, link: '/plans/actions', queryParams: { status: PLAN_PENDING }, tone: 'neutral'
            });
            push(r.inspections == null ? null : {
                key: 'inspections', label: 'Təsdiq gözləyən yoxlamalar', icon: 'fact_check',
                count: r.inspections, link: '/inspections/approve', tone: 'neutral'
            });
            if (r.stages) {
                items.push(...this.stageItems(r.stages));
            }
            return { items, partial, hasSources: requested.length > 0 };
        }));
    }

    private stageItems(stages: DisruptionStageCount[]): AttentionItem[] {
        const total = (code: StageCode) => stages.find(s => s.stageCode === code)?.total ?? 0;
        const overdue = stages.reduce((sum, s) => sum + s.overdue, 0);
        const stage = (code: StageCode) => ({ link: '/disruptions/tracking', queryParams: { stage: code } });
        return [
            { key: 'overdue', label: 'Son tarixi keçən uyğunsuzluqlar', icon: 'schedule', count: overdue,
              link: '/disruptions/tracking', queryParams: { overdue: 1 }, tone: 'danger' },
            { key: 'returned', label: 'Qaytarılıb, yenidən cavab gözləyir', icon: 'undo', count: total('RETURNED'),
              ...stage('RETURNED'), tone: 'danger' },
            { key: 'inspector', label: 'Müfəttişin təsdiqində', icon: 'person_search', count: total('INSPECTOR'),
              ...stage('INSPECTOR'), tone: 'neutral' },
            { key: 'head', label: 'Baş müfəttişin təsdiqində', icon: 'supervisor_account', count: total('HEAD_INSPECTOR'),
              ...stage('HEAD_INSPECTOR'), tone: 'neutral' },
        ];
    }
}

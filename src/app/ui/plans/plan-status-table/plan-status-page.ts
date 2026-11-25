import { PLAN_STATUS_LABELS } from '../../../shared/status/status-meta';
import { STATUS_ACTIONS, StatusAction } from '../../../shared/status/status-actions';

/** `InspectionPlans.Status` (bax front CLAUDE.md, "Domen dəyərləri") */
export const PLAN_STATUS = {
    PENDING: 1,
    APPROVED: 2,
    AWAITING_APPROVAL: 3,
    COMPLETED: 4,
    REJECTED: -1,
} as const;

/** Bir status keçidi: hansı statuslardan, hansına, hansı fellə */
export interface PlanTransition {
    action: StatusAction;
    from: readonly number[];
    to: number;
    /** Uğur bildirişi: [bir qeyd, bir neçə qeyd]. Düymədəki feli təkrarlayır. */
    success: readonly [string, string];
}

/**
 * Plan statusunu dəyişən siyahı səhifəsinin təsviri. Üç ekran (Əməliyyatlar, Yoxlanılmış, Yoxlama təsdiqi)
 * eyni komponentdir (`PlanStatusTableComponent`), fərq yalnız buradadır. Route-un `data.statusPage`-ində verilir.
 */
export interface PlanStatusPage {
    subtitle: string;
    tableTitle: string;
    tableIcon: string;
    /** Qeydin adı (sətir sayı, yükləmə xətası): "plan" / "yoxlama" */
    noun: 'Planlar' | 'Yoxlamalar';
    /** Süzgəcdə seçilən statuslar; birincisi açılışda seçilir. Bir status varsa süzgəc göstərilmir. */
    statuses: readonly number[];
    transitions: readonly PlanTransition[];
    /** Sətirdən yoxlama detalına keçid (yalnız yoxlaması aparılmış planlarda mənalıdır) */
    showDetails: boolean;
    emptyMessage: string;
}

const { PENDING, APPROVED, AWAITING_APPROVAL, COMPLETED, REJECTED } = PLAN_STATUS;

export const PLAN_ACTIONS_PAGE: PlanStatusPage = {
    subtitle: 'Planları təsdiqləyin və ya rədd edin',
    tableTitle: 'Planlar',
    tableIcon: 'event_list',
    noun: 'Planlar',
    statuses: [PENDING, APPROVED, REJECTED],
    transitions: [
        // Səhv rədd edilmiş plan da təsdiqlənə bilər
        { action: STATUS_ACTIONS.approve, from: [PENDING, REJECTED], to: APPROVED, success: ['Plan təsdiqləndi', 'Planlar təsdiqləndi'] },
        { action: STATUS_ACTIONS.reject, from: [PENDING, APPROVED], to: REJECTED, success: ['Plan rədd edildi', 'Planlar rədd edildi'] },
    ],
    showDetails: false,
    emptyMessage: 'Bu statusda plan yoxdur',
};

export const INSPECTION_APPROVE_PAGE: PlanStatusPage = {
    subtitle: 'Mobildə bitmiş yoxlamaları təsdiqləyin və ya mobilə qaytarın',
    tableTitle: 'Təsdiq gözləyən yoxlamalar',
    tableIcon: 'fact_check',
    noun: 'Yoxlamalar',
    statuses: [AWAITING_APPROVAL],
    transitions: [
        { action: STATUS_ACTIONS.approve, from: [AWAITING_APPROVAL], to: COMPLETED, success: ['Yoxlama təsdiqləndi', 'Yoxlamalar təsdiqləndi'] },
        { action: STATUS_ACTIONS.returnToMobile, from: [AWAITING_APPROVAL], to: APPROVED, success: ['Yoxlama mobilə qaytarıldı', 'Yoxlamalar mobilə qaytarıldı'] },
    ],
    showDetails: true,
    emptyMessage: 'Təsdiq gözləyən yoxlama yoxdur',
};

export const PLAN_CHECKED_PAGE: PlanStatusPage = {
    subtitle: 'Yekunlaşmış yoxlamalar. Səhv yekunlaşan planı yenidən açıb mobilə qaytarın',
    tableTitle: 'Yekunlaşmış planlar',
    tableIcon: 'task_alt',
    noun: 'Planlar',
    statuses: [COMPLETED],
    transitions: [
        // Uyğunsuzluğu mağaza zəncirinə düşmüş plan yenidən açılmır: server 409 və səbəbini qaytarır
        { action: STATUS_ACTIONS.reopen, from: [COMPLETED], to: APPROVED, success: ['Plan yenidən açıldı', 'Planlar yenidən açıldı'] },
    ],
    showDetails: true,
    emptyMessage: 'Yekunlaşmış plan yoxdur',
};

export const statusOptionLabel = (status: number): string => PLAN_STATUS_LABELS[status] ?? String(status);

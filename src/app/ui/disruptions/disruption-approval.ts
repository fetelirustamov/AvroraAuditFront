import { AuthService } from '../../auth/auth.service';
import { StatusActionKey } from '../../shared/status/status-actions';

/** `Disruptions.Status`: 0 müfəttiş, 1 baş müfəttiş, 2 təsdiqlənib (mağaza zənciri başlayır), -1 rədd */
export const DISRUPTION_STATUS = {
    REJECTED: -1,
    INSPECTOR: 0,
    HEAD_INSPECTOR: 1,
    APPROVED: 2,
} as const;

/** Uyğunsuzluq təsdiqi yalnız yoxlaması yekunlaşmış planda verilir ("Müfəttiş təsdiqi" növbəsi ilə eyni şərt) */
export const PLAN_COMPLETED = 4;

/** Təsdiq edən istifadəçinin rolu. Rol ayrılığı frontdadır (backend setStatus rol yoxlamır). */
export interface DisruptionApprover {
    isHeadInspector: boolean;
    isAdmin: boolean;
    userId: number | null;
}

export function approverFromAuth(auth: AuthService): DisruptionApprover {
    const id = Number(auth.getUserInfo()?.Id);
    return {
        // Admin baş müfəttişin bütün imkanlarına malikdir
        isHeadInspector: auth.hasAnyRole(['HeadInspector', 'Admin']),
        isAdmin: auth.hasRole('Admin'),
        userId: Number.isFinite(id) ? id : null,
    };
}

/** Təsdiqin nəticə statusu: müfəttiş 0→1, baş müfəttiş birbaşa 2, Admin hər iki addımı ayrıca verir (0→1, 1→2). */
export function nextApproveStatus(status: number, approver: DisruptionApprover): number {
    if (approver.isAdmin) return status === DISRUPTION_STATUS.INSPECTOR ? DISRUPTION_STATUS.HEAD_INSPECTOR : DISRUPTION_STATUS.APPROVED;
    return approver.isHeadInspector ? DISRUPTION_STATUS.APPROVED : DISRUPTION_STATUS.HEAD_INSPECTOR;
}

/**
 * İstifadəçinin bu uyğunsuzluqda edə biləcəyi əməliyyatlar — "Müfəttiş təsdiqi" ekranının qaydası:
 * müfəttiş yalnız öz qeydini müfəttiş mərhələsində (0) təsdiqləyir və ya rədd edir;
 * baş müfəttiş və Admin 0 və 1-də işləyir, 1-də müfəttişə qaytara da bilir.
 */
export function disruptionActions(
    d: { status: number; inspectorId: number },
    approver: DisruptionApprover,
): StatusActionKey[] {
    if (d.status === DISRUPTION_STATUS.INSPECTOR) {
        const own = approver.userId != null && d.inspectorId === approver.userId;
        return approver.isHeadInspector || own ? ['approve', 'reject'] : [];
    }
    if (d.status === DISRUPTION_STATUS.HEAD_INSPECTOR && approver.isHeadInspector) {
        return ['approve', 'reject', 'returnToInspector'];
    }
    return [];
}

/** Əməliyyatın nəticə statusu */
export function disruptionActionStatus(key: StatusActionKey, status: number, approver: DisruptionApprover): number {
    switch (key) {
        case 'approve': return nextApproveStatus(status, approver);
        case 'returnToInspector': return DISRUPTION_STATUS.INSPECTOR;
        default: return DISRUPTION_STATUS.REJECTED;
    }
}

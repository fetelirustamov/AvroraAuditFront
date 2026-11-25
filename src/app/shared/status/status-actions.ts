import { ConfirmOptions } from '../components/confirm-dialog/confirm-dialog.component';
import { StatusTone } from './status-meta';

/**
 * Status dəyişdirən əməliyyatların lüğəti (bax `docs/design/glossary.md`, "Düymələr").
 * Eyni fel həmişə eyni işi görür: düymə, tooltip, `aria-label`, dialoq və bildiriş bu mətni təkrarlayır.
 *
 * Burada status kodu yoxdur: hansı əməliyyatın hansı keçid olduğunu (məs. plan 3→2) ekran özü bilir.
 */
export type StatusActionKey = 'approve' | 'reject' | 'returnToMobile' | 'reopen' | 'returnToInspector';

export interface StatusAction {
    key: StatusActionKey;
    /** Düymə mətni (fel): "Təsdiqlə", "Rədd et". */
    label: string;
    /** Material Symbols ikonu. */
    icon: string;
    /** Rəngin mənası: təsdiq → success, rədd → danger, geri qaytarma → neutral. */
    tone: StatusTone;
    /** `true`: əməliyyatdan əvvəl təsdiq dialoqu açılır. */
    confirm: boolean;
    /** `true`: dialoqda səbəb məcburidir. Səbəb statusla birlikdə serverə gedir və qeydin səhifəsində göstərilir. */
    requiresReason: boolean;
    /** Dialoq başlığı (sual formasında). */
    confirmTitle: string;
    /** Dialoq mətni: neçə qeydə təsir edir. */
    confirmMessage: (count: number) => string;
}

/** Serverdəki səbəb sahəsinin uzunluğu (`StatusChangeLogs.Reason`, `StatusReason.MaxLength`). */
export const STATUS_REASON_MAX_LENGTH = 1000;

const records = (count: number): string => (count === 1 ? 'Seçilmiş qeyd' : `${count} qeyd`);

/**
 * Hər əməliyyat üçün fel, ikon, ton və dialoq mətni.
 * Rədd və geri qaytarma səbəb tələb edir: göndərilən adam (müfəttiş, mağaza) niyəsini görməlidir.
 */
export const STATUS_ACTIONS: Readonly<Record<StatusActionKey, StatusAction>> = {
    approve: {
        key: 'approve',
        label: 'Təsdiqlə',
        icon: 'check',
        tone: 'success',
        confirm: false,
        requiresReason: false,
        confirmTitle: 'Təsdiqlənsin?',
        confirmMessage: count => `${records(count)} təsdiqlənəcək və növbəti mərhələyə keçəcək.`,
    },
    reject: {
        key: 'reject',
        label: 'Rədd et',
        icon: 'close',
        tone: 'danger',
        confirm: true,
        requiresReason: true,
        confirmTitle: 'Rədd edilsin?',
        confirmMessage: count => `${records(count)} rədd ediləcək.`,
    },
    returnToMobile: {
        key: 'returnToMobile',
        label: 'Mobilə qaytar',
        icon: 'undo',
        tone: 'neutral',
        confirm: true,
        requiresReason: true,
        confirmTitle: 'Mobilə qaytarılsın?',
        confirmMessage: count => `${records(count)} müfəttişin mobilinə geri göndəriləcək.`,
    },
    reopen: {
        key: 'reopen',
        label: 'Yenidən aç',
        icon: 'replay',
        tone: 'neutral',
        confirm: true,
        requiresReason: true,
        confirmTitle: 'Yenidən açılsın?',
        confirmMessage: count => `${records(count)} yenidən açılacaq və müfəttişin mobilinə qayıdacaq.`,
    },
    returnToInspector: {
        key: 'returnToInspector',
        label: 'Müfəttişə qaytar',
        icon: 'undo',
        tone: 'neutral',
        confirm: true,
        requiresReason: true,
        confirmTitle: 'Müfəttişə qaytarılsın?',
        confirmMessage: count => `${records(count)} müfəttişin təsdiqinə qaytarılacaq.`,
    },
};

/**
 * Əməliyyatdan `ConfirmDialogService.confirm()` üçün seçimlər qurur.
 *
 * @param count təsir olunan qeyd sayı
 * @param items dialoqda göstəriləcək qeydlər (məs. "4335 · Mağaza adı")
 *
 * @example
 * const action = STATUS_ACTIONS.reject;
 * this.confirmDialog.confirm(statusActionConfirm(action, rows.length, rows.map(r => r.locationName)))
 *   .subscribe(result => { if (result) this.changeStatus(rows, -1, result.reason); });
 */
export function statusActionConfirm(action: StatusAction, count: number, items?: readonly string[]): ConfirmOptions {
    return {
        title: action.confirmTitle,
        message: action.confirmMessage(count),
        confirmText: action.label,
        tone: action.tone === 'danger' ? 'danger' : 'default',
        items,
        reason: action.requiresReason ? { required: true, maxLength: STATUS_REASON_MAX_LENGTH } : undefined,
    };
}

import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData, ConfirmOptions, ConfirmResult } from './confirm-dialog.component';

export type { ConfirmOptions, ConfirmReasonOptions, ConfirmResult } from './confirm-dialog.component';

let nextTitleId = 0;

/**
 * Ortaq təsdiq dialoqu. Silmə, rədd, mobilə qaytarma kimi əməliyyatlardan əvvəl soruşur.
 *
 * Nəticə: təsdiqdə `ConfirmResult` (səbəb sahəsi varsa `reason` ilə), ləğvdə (düymə, Esc, fon) `undefined`.
 *
 * @example
 * this.confirmDialog.confirm({
 *   title: 'Plan rədd edilsin?',
 *   message: '3 plan rədd ediləcək.',
 *   confirmText: 'Rədd et',
 *   tone: 'danger',
 *   items: selected.map(p => `${p.locationCode} · ${p.locationName}`),
 *   reason: { required: true, minLength: 10 },
 * }).subscribe(result => {
 *   if (!result) return;
 *   this.reject(selected, result.reason!);
 * });
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private readonly dialog = inject(MatDialog);

    confirm(options: ConfirmOptions): Observable<ConfirmResult | undefined> {
        const titleId = `confirm-dialog-title-${nextTitleId++}`;
        return this.dialog
            .open<ConfirmDialogComponent, ConfirmDialogData, ConfirmResult>(ConfirmDialogComponent, {
                width: '440px',
                maxWidth: '95vw',
                ariaLabelledBy: titleId,
                role: options.tone === 'danger' ? 'alertdialog' : 'dialog',
                data: { ...options, titleId },
            })
            .afterClosed();
    }
}

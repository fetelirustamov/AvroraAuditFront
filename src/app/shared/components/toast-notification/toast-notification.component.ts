import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
    title: string;
    message?: string;
    type: ToastType;
    /** Millisaniyə; `0` — istifadəçi bağlayana qədər qalır (zaman zolağı göstərilmir). */
    duration: number;
}

const ICON_MAP: Record<ToastType, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

/** Bildiriş görünüşü. Birbaşa açma, `NotificationService` işlət. */
@Component({
    selector: 'app-toast-notification',
    standalone: true,
    templateUrl: './toast-notification.component.html',
    styleUrl: './toast-notification.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastNotificationComponent {
    protected readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
    private readonly snackBarRef = inject<MatSnackBarRef<ToastNotificationComponent>>(MatSnackBarRef);

    protected readonly icon = ICON_MAP[this.data.type];

    protected dismiss(): void {
        this.snackBarRef.dismiss();
    }
}

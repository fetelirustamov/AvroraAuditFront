import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastData, ToastNotificationComponent, ToastType } from '../components/toast-notification/toast-notification.component';

interface NotifyOptions {
    /** Başlığın altındakı izah (məs. serverin mesajı). */
    message?: string;
}

/**
 * Müddət növə görə sabitdir, ekran dəyişmir:
 * xəta istifadəçi bağlayana qədər qalır (oxunmadan itməsin), xəbərdarlıq 8 s, uğur və məlumat 4 s.
 */
const DURATION: Record<ToastType, number> = {
    error: 0,
    warning: 8000,
    success: 4000,
    info: 4000,
};

/**
 * Bildirişlər (toast). Yuxarı sağda çıxır, paginatoru örtmür; rəng status token-lərindən gəlir.
 * Mətn feli düymədəki əməliyyatla eyni olsun: "Plan təsdiqləndi", "Mağaza silindi".
 *
 * @example
 * this.notify.success('Plan təsdiqləndi');
 * this.notify.error('Plan təsdiqlənmədi', { message: apiErrorMessage(err) });
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly snackBar = inject(MatSnackBar);

    success(title: string, options: NotifyOptions = {}): void {
        this.show(title, 'success', options);
    }

    error(title: string, options: NotifyOptions = {}): void {
        this.show(title, 'error', options);
    }

    warning(title: string, options: NotifyOptions = {}): void {
        this.show(title, 'warning', options);
    }

    info(title: string, options: NotifyOptions = {}): void {
        this.show(title, 'info', options);
    }

    private show(title: string, type: ToastType, options: NotifyOptions): void {
        const duration = DURATION[type];
        const data: ToastData = { title, message: options.message, type, duration };

        this.snackBar.openFromComponent(ToastNotificationComponent, {
            data,
            duration,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            politeness: type === 'error' ? 'assertive' : 'polite',
            panelClass: ['ap-toast-panel'],
        });
    }
}

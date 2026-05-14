import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastData, ToastNotificationComponent, ToastType } from '../components/toast-notification/toast-notification.component';

interface NotifyOptions {
  message?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly DEFAULT_DURATION = 4000;

  constructor(private snackBar: MatSnackBar) {}

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
    const duration = options.duration ?? this.DEFAULT_DURATION;

    const data: ToastData = {
      title,
      message: options.message,
      type,
      duration,
    };

    this.snackBar.openFromComponent(ToastNotificationComponent, {
      data,
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['ap-toast-panel'],
    });
  }
}

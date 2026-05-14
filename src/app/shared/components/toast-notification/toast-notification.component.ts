import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  title: string;
  message?: string;
  type: ToastType;
  duration: number;
}

const ICON_MAP: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'cancel',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
})
export class ToastNotificationComponent {
  get icon(): string {
    return ICON_MAP[this.data.type];
  }

  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: ToastData,
    private snackBarRef: MatSnackBarRef<ToastNotificationComponent>
  ) {}

  dismiss(): void {
    this.snackBarRef.dismiss();
  }
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';

/**
 * Audit UI üçün vahid yükləmə overlay-i — relative konteyner daxilində istifadə olunur.
 * Məsələn: `<div class="audit-table-loading-shell"> … <app-audit-loading-overlay *ngIf="isLoading" />`
 */
@Component({
  selector: 'app-audit-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-loading-overlay.component.html',
  styleUrl: './audit-loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-audit-loading-overlay-host',
    role: 'status',
    'aria-live': 'polite',
    '[attr.aria-busy]': 'true',
    '[attr.aria-label]': 'effectiveAriaLabel',
  },
})
export class AuditLoadingOverlayComponent {
  @Input() title = 'Məlumatlar yüklənir';

  @Input() hint = 'Cədvəl hazırlanır — bir neçə saniyə çəkə bilər';

  /** Boşdursa, title əsasında */
  @Input() ariaLabel = '';

  get effectiveAriaLabel(): string {
    return this.ariaLabel?.trim() || this.title?.trim() || 'Yüklənir';
  }
}

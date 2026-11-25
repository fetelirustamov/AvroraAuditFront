import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Siyahının data olmayan halı:
 * - `idle` — hələ axtarılmayıb;
 * - `empty` — axtarılıb, nəticə yoxdur;
 * - `error` — yüklənmədi (`role="alert"`, "Yenidən cəhd et" düyməsi `retry` hadisəsini verir).
 */
export type ListStateKind = 'idle' | 'empty' | 'error';

/**
 * Siyahının üç boş vəziyyəti, `.empty-state` görünüşü ilə. Cədvəl kartının içində, cədvəlin yerində göstər.
 * Yüklənmə zamanı köhnə data yerində qalır: bu komponent yükləmə halını göstərmir.
 *
 * @example
 * @if (loadError) {
 *   <app-list-state state="error" [errorMessage]="loadError" (retry)="search()" />
 * } @else if (!searched) {
 *   <app-list-state state="idle" />
 * } @else if (!rows.length) {
 *   <app-list-state state="empty" />
 * }
 */
@Component({
    selector: 'app-list-state',
    standalone: true,
    templateUrl: './list-state.component.html',
    styleUrl: './list-state.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListStateComponent {
    readonly state = input.required<ListStateKind>();
    /** `idle` və `empty` üçün mətni əvəz edir. */
    readonly message = input<string>();
    /** `error` üçün mətn (adətən `apiErrorMessage(err)`). Standart: "Məlumat yüklənmədi". */
    readonly errorMessage = input<string>();
    /** "Yenidən cəhd et" basılanda. */
    readonly retry = output<void>();
}

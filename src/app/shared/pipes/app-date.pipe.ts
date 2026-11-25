import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { BAKU_TZ, parseApiUtcDate } from '../utils/date.util';

export type AppDateFormat = 'date' | 'datetime';

const PATTERNS: Record<AppDateFormat, string> = {
    date: 'dd.MM.yyyy',
    datetime: 'dd.MM.yyyy HH:mm',
};

/** Yalnız tarix (vaxtsız): təqvim günüdür, zonaya çevrilmir. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tarixi istifadəçiyə göstərir: `'date'` → `25.11.2026`, `'datetime'` → `25.11.2026 14:30`.
 * Həmişə Bakı vaxtı (`+0400`), brauzerin zonasından asılı deyil. Boş dəyər → "—".
 *
 * Zonasız API stringi (`2026-11-25T10:30:00`) UTC sayılır (`parseApiUtcDate`), yalnız tarix
 * (`2026-11-25`) isə olduğu kimi göstərilir. Serverə gedən parametr üçün işlətmə.
 *
 * @example
 * {{ row.createdDate | appDate }}            <!-- 25.11.2026 -->
 * {{ row.createdDate | appDate:'datetime' }} <!-- 25.11.2026 14:30 -->
 */
@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
    private readonly locale = inject(LOCALE_ID);

    transform(value: string | Date | number | null | undefined, format: AppDateFormat = 'date'): string {
        if (value == null || value === '') return '—';

        if (typeof value === 'string' && DATE_ONLY.test(value.trim())) {
            return formatDate(value.trim(), PATTERNS[format], this.locale);
        }

        const normalized = typeof value === 'number' ? value : parseApiUtcDate(value);
        if (normalized == null) return '—';

        try {
            return formatDate(normalized, PATTERNS[format], this.locale, BAKU_TZ);
        } catch {
            return '—';
        }
    }
}

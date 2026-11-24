import { formatDate } from '@angular/common';

/** API-dan gələn UTC tarix stringini DatePipe üçün normalizə edir. */
export function parseApiUtcDate(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return raw;
  }

  return `${raw}Z`;
}

/** Layihə boyu istifadə olunan Bakı vaxt zonası offseti (DatePipe formatı). */
export const BAKU_TZ = '+0400';

/**
 * API-dan gələn tarixi FullCalendar üçün offset-siz "divar saatı" stringinə çevirir.
 * timeZone: 'local' altında FullCalendar bu sahələri olduğu kimi render edir,
 * yəni brauzerin zonasından asılı olmayaraq həmişə Bakı vaxtı görünür.
 */
export function toBakuWallClock(value: string | Date | null | undefined): string | null {
  const normalized = parseApiUtcDate(value);
  return normalized == null ? null : formatDate(normalized, "yyyy-MM-dd'T'HH:mm:ss", 'en-US', BAKU_TZ);
}

/** Tarixi istifadəçiyə göstərmək üçün Bakı vaxtı ilə formatlayır. */
export function toBakuDisplay(value: string | Date | null | undefined): string | null {
  const normalized = parseApiUtcDate(value);
  return normalized == null ? null : formatDate(normalized, 'dd.MM.yyyy HH:mm', 'en-US', BAKU_TZ);
}

/** `yyyy-MM-dd` stringini verilən gün sayı qədər sürüşdürür (zonadan asılı olmayan UTC arifmetikası). */
export function isoDateAddDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

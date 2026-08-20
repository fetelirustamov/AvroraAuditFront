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

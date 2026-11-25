import { ParamMap, Router } from '@angular/router';

/**
 * Filtr vəziyyətini URL-in query parametrlərində saxlamaq üçün kiçik köməkçilər.
 * Səhifə yenilənəndə və link paylaşılanda filtr, səhifə nömrəsi və seçilmiş qeyd itmir.
 *
 * @example
 * // Açılışda: URL-dən oxu
 * const q = this.route.snapshot.queryParamMap;
 * this.form.patchValue({
 *   search: queryString(q, 'search') ?? '',
 *   firmIds: queryNumbers(q, 'firm'),
 *   start: queryDate(q, 'from'),
 * });
 * this.paginator.pageIndex = queryNumber(q, 'page') ?? 0;
 *
 * // "Axtar" basılanda: URL-ə yaz (boş dəyərlər URL-dən silinir)
 * writeQueryState(this.router, {
 *   search: v.search,
 *   firm: v.firmIds,
 *   from: v.start,
 *   page: 0,
 * });
 */

/** URL-ə yazıla bilən dəyər. `null`, `undefined`, `''` və boş massiv açarı URL-dən silir. */
export type QueryValue = string | number | Date | readonly (string | number)[] | null | undefined;

/** Mətn parametri. Yoxdursa və ya boşdursa `null`. */
export function queryString(params: ParamMap, key: string): string | null {
    const value = params.get(key)?.trim();
    return value ? value : null;
}

/** Rəqəm parametri. Yoxdursa və ya rəqəm deyilsə `null`. */
export function queryNumber(params: ParamMap, key: string): number | null {
    const value = queryString(params, key);
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Rəqəm siyahısı: həm təkrarlanan açar (`?firm=1&firm=2`), həm vergüllü dəyər (`?firm=1,2`) oxunur. */
export function queryNumbers(params: ParamMap, key: string): number[] {
    return params.getAll(key)
        .flatMap(value => value.split(','))
        .map(part => part.trim())
        .filter(part => part !== '')
        .map(Number)
        .filter(Number.isFinite);
}

/** Tarix parametri (`yyyy-MM-dd`) → yerli gecəyarısı `Date` (datepicker-in verdiyi forma). */
export function queryDate(params: ParamMap, key: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(queryString(params, key) ?? '');
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `Date`-i URL üçün `yyyy-MM-dd`-yə çevirir. Yerli gün götürülür: `toISOString()` UTC-yə keçir
 * və Bakıda (+04:00) gecəyarısı tarixi bir gün geri salır.
 */
export function toQueryDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toQueryParam(value: QueryValue): string | string[] | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : toQueryDate(value);
    if (Array.isArray(value)) return value.length ? value.map(String) : null;
    return String(value);
}

/**
 * Dəyərləri cari URL-in query parametrlərinə yazır (digər parametrlər qalır).
 * Boş dəyər açarı silir. `replaceUrl`: hər filtr dəyişikliyi brauzer tarixçəsinə yeni addım yazmır.
 */
export function writeQueryState(router: Router, values: Record<string, QueryValue>): Promise<boolean> {
    const queryParams: Record<string, string | string[] | null> = {};
    for (const [key, value] of Object.entries(values)) {
        queryParams[key] = toQueryParam(value);
    }
    return router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
}

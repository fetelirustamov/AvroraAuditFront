import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS, MatDateFormats, NativeDateAdapter } from '@angular/material/core';

const DMY = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/;

/** Sahədə göstərilən format üçün işarə: adapter bunu `dd.MM.yyyy` kimi yazır. */
const DMY_DISPLAY = 'dd.MM.yyyy';

/**
 * Datepicker üçün tarix adapteri: sahə tarixi `dd.MM.yyyy` göstərir və
 * əl ilə yazılan `25.11.2026` (həmçinin `25/11/2026`, `25-11-2026`) oxunur.
 * Standart NativeDateAdapter belə yazını tanımır, çünki `Date.parse`-a güvənir.
 */
@Injectable()
export class AzDateAdapter extends NativeDateAdapter {
    override parse(value: unknown, parseFormat?: unknown): Date | null {
        if (typeof value === 'string') {
            const m = DMY.exec(value);
            if (m) {
                const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
                const date = new Date(year, month - 1, day);
                // 31.02.2026 kimi mövcud olmayan tarix qəbul edilmir
                const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
                return valid ? date : this.invalid();
            }
        }
        return super.parse(value, parseFormat);
    }

    override format(date: Date, displayFormat: object | string): string {
        if (displayFormat === DMY_DISPLAY) {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
        }
        return super.format(date, displayFormat as object);
    }
}

const AZ_DATE_FORMATS: MatDateFormats = {
    ...MAT_NATIVE_DATE_FORMATS,
    display: { ...MAT_NATIVE_DATE_FORMATS.display, dateInput: DMY_DISPLAY },
};

/** Datepicker işlədən hər səhifə bunu çərçivədən alır; komponentdə MatNativeDateModule import etmə. */
export const DATE_ADAPTER_PROVIDERS: Provider[] = [
    { provide: DateAdapter, useClass: AzDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: AZ_DATE_FORMATS }
];

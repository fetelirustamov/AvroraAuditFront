import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

const DMY = /^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$/;

/**
 * Datepicker üçün tarix adapteri: `az` lokalında sahə `dd.MM.yyyy` göstərir,
 * əl ilə yazılan `25.11.2026` (həmçinin `25/11/2026`, `25-11-2026`) də oxunur.
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
}

/** Datepicker işlədən hər səhifə bunu çərçivədən alır; komponentdə MatNativeDateModule import etmə. */
export const DATE_ADAPTER_PROVIDERS: Provider[] = [
    { provide: DateAdapter, useClass: AzDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS }
];

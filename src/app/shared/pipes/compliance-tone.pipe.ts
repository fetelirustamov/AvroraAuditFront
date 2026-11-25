import { Pipe, PipeTransform } from '@angular/core';
import { ComplianceTone, complianceTone } from '../utils/compliance';

/**
 * Uyğunluq faizinin tonu (`success | warning | danger`), həddlər `compliance.ts`-dədir.
 * Şablonda: `[ngClass]="'faiz-' + (value | complianceTone)"`. Rəqəm deyilsə `null`.
 */
@Pipe({ name: 'complianceTone', standalone: true })
export class ComplianceTonePipe implements PipeTransform {
    transform(value: unknown): ComplianceTone | null {
        if (value === null || value === undefined || value === '') return null;
        const percent = Number(value);
        return Number.isFinite(percent) ? complianceTone(percent) : null;
    }
}

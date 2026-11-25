import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** Səbəb sahəsi: rədd, mobilə qaytarma kimi əməliyyatlarda izah tələb olunur. */
export interface ConfirmReasonOptions {
    /** `true`: səbəb yazılmadan təsdiq düyməsi bağlı qalır. */
    required: boolean;
    /** Sahənin adı. Standart: "Səbəb". */
    label?: string;
    /** Minimal simvol sayı (boşluqlar sayılmır). Sahənin altında sayğac göstərilir. */
    minLength?: number;
}

export interface ConfirmOptions {
    /** Sual formasında başlıq: "Mağaza silinsin?" */
    title: string;
    /** Nə baş verəcəyini deyən bir-iki cümlə. */
    message: string;
    /** Təsdiq düyməsinin mətni. Standart: "Təsdiqlə". Feli düymədəki əməliyyatla eyni olsun ("Sil", "Rədd et"). */
    confirmText?: string;
    /** Ləğv düyməsinin mətni. Standart: "Ləğv et". */
    cancelText?: string;
    /** `danger`: geri qaytarılmayan və ya dağıdıcı əməliyyat (silmə, rədd), təsdiq düyməsi qırmızı olur. */
    tone?: 'danger' | 'default';
    /** Təsir olunan qeydlər (məs. "4335 · Mağaza adı"). İlk 5-i göstərilir, qalanı "və daha N qeyd". */
    items?: readonly string[];
    /** Səbəb sahəsi. Verilməsə sahə göstərilmir. */
    reason?: ConfirmReasonOptions;
}

/** Təsdiqin nəticəsi. Dialoq ləğv ediləndə (düymə, Esc, fon) `undefined` qayıdır. */
export interface ConfirmResult {
    /** Yazılmış səbəb (kənar boşluqsuz). Səbəb sahəsi yoxdursa və ya boşdursa `undefined`. */
    reason?: string;
}

/** Dialoq daxili data: xidmət başlığın ID-sini əlavə edir (aria-labelledby). */
export interface ConfirmDialogData extends ConfirmOptions {
    titleId: string;
}

const VISIBLE_ITEMS = 5;

function reasonValidator(options: ConfirmReasonOptions): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
        const length = (control.value ?? '').trim().length;
        if (options.required && length === 0) return { required: true };
        if (options.minLength && length > 0 && length < options.minLength) {
            return { minlength: { requiredLength: options.minLength, actualLength: length } };
        }
        return null;
    };
}

/**
 * Ortaq təsdiq dialoqu. Birbaşa açma, `ConfirmDialogService.confirm()` işlət.
 * "Ləğv et" neytraldır və ilkin fokus ondadır: Enter təsadüfən dağıdıcı əməliyyatı təsdiqləmir.
 */
@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
    templateUrl: './confirm-dialog.component.html',
    styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
    protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
    private readonly dialogRef = inject<MatDialogRef<ConfirmDialogComponent, ConfirmResult>>(MatDialogRef);

    protected readonly visibleItems = (this.data.items ?? []).slice(0, VISIBLE_ITEMS);
    protected readonly hiddenItemCount = Math.max(0, (this.data.items?.length ?? 0) - VISIBLE_ITEMS);

    protected readonly reasonControl = new FormControl('', {
        nonNullable: true,
        validators: this.data.reason ? [reasonValidator(this.data.reason)] : [],
    });

    protected get reasonLength(): number {
        return this.reasonControl.value.trim().length;
    }

    protected get canConfirm(): boolean {
        return !this.data.reason || this.reasonControl.valid;
    }

    protected confirm(): void {
        if (!this.canConfirm) {
            this.reasonControl.markAsTouched();
            return;
        }
        const reason = this.reasonControl.value.trim();
        this.dialogRef.close(reason ? { reason } : {});
    }

    protected cancel(): void {
        this.dialogRef.close();
    }
}

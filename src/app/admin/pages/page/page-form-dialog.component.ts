import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { PageService } from '../../services/page.service';
import { PageDto } from '../../models/page.model';

/** `item` verilsə redaktə, verilməsə yeni səhifə. */
export interface PageFormDialogData {
    item?: PageDto;
}

/**
 * Səhifə forması (dialoq). Nəticə: saxlanılıbsa `true`.
 * Açar route-dakı `pageKey` və rol icazələri ilə bağlıdır: redaktədə dəyişmir,
 * səhv dəyişiklik səhifəni hamının menyusundan gizlədərdi.
 */
@Component({
    selector: 'app-page-form-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    templateUrl: './page-form-dialog.component.html',
    styleUrl: './page-form-dialog.component.scss'
})
export class PageFormDialogComponent {
    private readonly pageService = inject(PageService);
    private readonly notify = inject(NotificationService);
    private readonly dialogRef = inject<MatDialogRef<PageFormDialogComponent, boolean>>(MatDialogRef);
    private readonly item = inject<PageFormDialogData>(MAT_DIALOG_DATA).item;

    readonly isEdit = !!this.item;
    isSaving = false;

    readonly form = inject(FormBuilder).nonNullable.group({
        name: [this.item?.name ?? '', [Validators.required, Validators.minLength(2)]],
        key: [{ value: this.item?.key ?? '', disabled: this.isEdit }, [Validators.required, Validators.minLength(2)]]
    });

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        // Redaktədə açar disabled-dir, getRawValue onu yenə də (dəyişməmiş) göndərir
        const { name, key } = this.form.getRawValue();
        const payload = { name: name.trim(), key: key.trim(), status: 1 };
        const request = this.item
            ? this.pageService.update(this.item.id, { ...payload, id: this.item.id })
            : this.pageService.create(payload);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(this.isEdit ? 'Səhifə yeniləndi' : 'Səhifə əlavə edildi');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(apiErrorMessage(err, this.isEdit ? 'Səhifə yenilənmədi' : 'Səhifə əlavə edilmədi'))
        });
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

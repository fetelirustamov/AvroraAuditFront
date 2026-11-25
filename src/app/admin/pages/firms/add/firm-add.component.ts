import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';

/** `item` verilsə redaktə, verilməsə yeni firma. */
export interface FirmDialogData {
    item?: FirmDto;
}

/** Firma forması (dialoq). Nəticə: saxlanılıbsa `true`. */
@Component({
    selector: 'app-firm-add',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    templateUrl: './firm-add.component.html',
    styleUrl: './firm-add.component.scss'
})
export class FirmAddComponent {
    private readonly notify = inject(NotificationService);
    private readonly firmService = inject(FirmService);
    private readonly dialogRef = inject<MatDialogRef<FirmAddComponent, boolean>>(MatDialogRef);
    private readonly item = inject<FirmDialogData>(MAT_DIALOG_DATA).item;

    readonly isEdit = !!this.item;
    isSaving = false;

    readonly form = inject(FormBuilder).nonNullable.group({
        name: [this.item?.name ?? '', Validators.required],
        description: [this.item?.description ?? ''],
        address: [this.item?.address ?? ''],
        phone: [this.item?.phone ?? ''],
        email: [this.item?.email ?? '', Validators.email],
        website: [this.item?.website ?? '']
    });

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const payload = this.form.getRawValue();
        const request = this.item
            ? this.firmService.updateFirm(this.item.id, payload)
            : this.firmService.createFirm(payload);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(this.isEdit ? 'Firma yeniləndi' : 'Firma əlavə edildi');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(apiErrorMessage(err, this.isEdit ? 'Firma yenilənmədi' : 'Firma əlavə edilmədi'))
        });
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

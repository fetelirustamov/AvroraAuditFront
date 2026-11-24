import { Component, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';

@Component({
    selector: 'app-firm-add',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule
    ],
    templateUrl: './firm-add.component.html',
    styleUrl: './firm-add.component.scss'
})
export class FirmAddComponent {
    form: FormGroup;
    pageTitle = 'Yeni Firma';
    isSaving = false;
    private readonly editId: number | null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private firmService: FirmService,
        @Optional() private dialogRef?: MatDialogRef<FirmAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: { mode: 'edit'; item: FirmDto }
    ) {
        const item = data?.mode === 'edit' ? data.item : null;
        this.editId = item?.id ?? null;
        if (item) this.pageTitle = 'Firmanı Redaktə Et';

        this.form = this.fb.group({
            name: [item?.name ?? '', Validators.required],
            description: [item?.description ?? ''],
            address: [item?.address ?? ''],
            phone: [item?.phone ?? ''],
            email: [item?.email ?? '', Validators.email],
            website: [item?.website ?? '']
        });
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
            return;
        }
        this.isSaving = true;
        const payload = this.form.getRawValue();
        const isEdit = this.editId !== null;
        const request = isEdit
            ? this.firmService.updateFirm(this.editId!, payload)
            : this.firmService.createFirm(payload);

        request.subscribe({
            next: (res) => {
                this.isSaving = false;
                this.notify.success(isEdit ? 'Firma yeniləndi' : 'Firma uğurla əlavə edildi');
                if (this.dialogRef) {
                    this.dialogRef.close(isEdit ? { updated: true } : { created: true, data: res });
                } else {
                    this.router.navigate(['/admin/firms']);
                }
            },
            error: (err) => {
                this.isSaving = false;
                this.notify.error(isEdit ? 'Firma yenilənmədi' : 'Firma əlavə edilmədi', {
                    message: err?.error?.message || 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
                });
            }
        });
    }

    cancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.router.navigate(['/admin/firms']);
        }
    }
}

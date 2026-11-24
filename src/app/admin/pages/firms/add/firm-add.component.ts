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

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private firmService: FirmService,
        @Optional() private dialogRef?: MatDialogRef<FirmAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
    ) {
        this.form = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            address: [''],
            phone: [''],
            email: ['', Validators.email],
            website: ['']
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

        this.firmService.createFirm(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this.notify.success('Firma uğurla əlavə edildi');
                if (this.dialogRef) {
                    this.dialogRef.close({ created: true, data: res });
                } else {
                    this.router.navigate(['/admin/firms']);
                }
            },
            error: () => {
                this.isSaving = false;
                this.notify.error('Firma əlavə edilmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
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

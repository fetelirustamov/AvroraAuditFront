import { Component, Inject, Optional, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SectionDto } from '../../../models/section.model';
import { SectionService } from '../../../services/section.service';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';

@Component({
    selector: 'app-section-add',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    templateUrl: './section-add.component.html',
    styleUrl: './section-add.component.scss'
})
export class SectionAddComponent implements OnInit {
    form!: FormGroup;
    firms: FirmDto[] = [];

    pageTitle = 'Yeni şöbə';
    isEditMode = false;
    isSaving = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private sectionService: SectionService,
        private firmService: FirmService,
        @Optional() private dialogRef?: MatDialogRef<SectionAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: SectionDto | { mode: 'edit', item: SectionDto } | { firmId: number }
    ) {
        this.form = this.fb.group({
            firmId: [null, Validators.required],
            sectionName: ['', Validators.required],
            sectionDescription: ['']
        });
    }

    ngOnInit(): void {
        this.loadFirms();

        const dialogData: any = this.data as any;
        if (dialogData?.mode === 'edit' && dialogData?.item) {
            this.isEditMode = true;
            this.pageTitle = 'Şöbəni redaktə et';
            this.form.patchValue({
                firmId: dialogData.item.firmId,
                sectionName: dialogData.item.sectionName,
                sectionDescription: dialogData.item.sectionDescription
            });
        } else if (dialogData?.firmId) {
            // "Audit Strukturu" səhifəsindən firma konteksti ilə açılıb - firma sahəsini əvvəlcədən doldur
            this.form.patchValue({ firmId: dialogData.firmId });
        }
    }

    private loadFirms() {
        this.firmService.getAllFirms().subscribe({
            next: response => {
                if (response.success) {
                    this.firms = response.data;
                }
            },
            error: e => this.notify.error(apiErrorMessage(e, 'Firmalar yüklənmədi'))
        });
    }

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
            return;
        }
        const payload = this.form.getRawValue();

        this.isSaving = true;
        if (this.isEditMode && (this.data as any)?.item?.id) {
            const id = (this.data as any).item.id as number;
            this.sectionService.update({ ...payload, id })
                .pipe(finalize(() => this.isSaving = false))
                .subscribe({
                    next: res => {
                        this.notify.success('Şöbə uğurla redaktə edildi');
                        if (this.dialogRef) {
                            this.dialogRef.close({ updated: true, data: res });
                        } else {
                            this.router.navigate(['/admin/sections']);
                        }
                    },
                    error: e => this.notify.error(apiErrorMessage(e, 'Şöbə redaktə edilmədi'))
                });
            return;
        }

        this.sectionService.create(payload)
            .pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: response => {
                    this.notify.success('Şöbə uğurla əlavə edildi');
                    if (this.dialogRef) {
                        this.dialogRef.close({ created: true, data: response });
                    } else {
                        this.router.navigate(['/admin/sections']);
                    }
                },
                error: e => this.notify.error(apiErrorMessage(e, 'Şöbə əlavə edilmədi'))
            });
    }

    cancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.router.navigate(['/admin/sections']);
        }
    }
} 
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { EMPTY, catchError, finalize, of, switchMap } from 'rxjs';
import { AttachmentService } from '../../../../admin/services/attachment.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { ACCEPTED_IMAGE_TYPES } from '../../../../shared/utils/upload-types';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { Disruption, DisruptionDto } from '../../disruption.model';
import { DisruptionService } from '../../disruption.service';

interface ReasonOption {
    id: number;
    reasonName: string;
}

/**
 * Uyğunsuzluğun redaktəsi: səbəb, son tarix (gün), açıqlama və əlavə şəkillər.
 * Yadda saxlananda `true` ilə bağlanır, ləğvdə `undefined`.
 */
@Component({
    selector: 'app-disruption-edit-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, FileUploadModule],
    templateUrl: './disruption-edit-dialog.component.html',
    styleUrl: './disruption-edit-dialog.component.scss',
})
export class DisruptionEditDialogComponent implements OnInit {
    protected readonly disruption = inject<DisruptionDto>(MAT_DIALOG_DATA);
    private readonly dialogRef = inject<MatDialogRef<DisruptionEditDialogComponent, boolean>>(MatDialogRef);
    private readonly disruptionService = inject(DisruptionService);
    private readonly attachmentService = inject(AttachmentService);
    private readonly notify = inject(NotificationService);

    protected readonly acceptedImageTypes = ACCEPTED_IMAGE_TYPES;
    protected reasons: ReasonOption[] = [];
    protected isSaving = false;

    protected readonly form = new FormGroup({
        disruptionReasonId: new FormControl<number | null>(this.disruption.disruptionReasonId, Validators.required),
        deadline: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
        description: new FormControl(this.disruption.description ?? '', { nonNullable: true, validators: Validators.required }),
        files: new FormControl<File[]>([], { nonNullable: true }),
    });

    ngOnInit(): void {
        this.disruptionService.getById(this.disruption.disruptionId).subscribe({
            next: response => {
                if (response.success && response.data) {
                    this.form.controls.deadline.setValue(response.data.deadline ?? null);
                }
            },
            error: error => this.notify.error(apiErrorMessage(error, 'Son tarix yüklənmədi')),
        });

        this.disruptionService.getReasonsByCategory(this.disruption.disruptionCategoryId).subscribe({
            next: response => this.reasons = response.success ? response.data ?? [] : [],
            error: error => {
                this.reasons = [];
                this.notify.error(apiErrorMessage(error, 'Səbəblər yüklənmədi'));
            },
        });
    }

    protected save(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const d = this.disruption;
        const updated: Disruption = {
            id: d.disruptionId,
            inspectorId: d.inspectorId,
            inspectionPlanId: d.inspectionPlanId,
            sectionId: d.sectionId,
            severityId: 0,
            disruptionReasonId: v.disruptionReasonId!,
            createdDate: d.createdDate,
            description: v.description,
            deadline: v.deadline,
            questionId: null,
            localId: '',
        };

        // Əvvəl şəkil, sonra cavab: şəkil yüklənməsə cavab göndərilmir
        const upload$ = v.files.length > 0
            ? this.attachmentService.uploadAttachment(Module.Disruption, MediaType.Image, d.disruptionId, v.files).pipe(
                catchError(error => {
                    this.notify.error(apiErrorMessage(error, 'Şəkil yüklənmədi, dəyişiklik saxlanmadı'));
                    return EMPTY;
                }),
            )
            : of(null);

        this.isSaving = true;
        upload$.pipe(
            switchMap(() => this.disruptionService.updateDisruption(updated).pipe(
                catchError(error => {
                    this.notify.error(apiErrorMessage(error, 'Uyğunsuzluq yenilənmədi'));
                    return EMPTY;
                }),
            )),
            finalize(() => this.isSaving = false),
        ).subscribe((response: { success: boolean; message?: string }) => {
            if (!response.success) {
                this.notify.error(response.message || 'Uyğunsuzluq yenilənmədi');
                return;
            }
            this.notify.success('Uyğunsuzluq yeniləndi');
            this.dialogRef.close(true);
        });
    }
}

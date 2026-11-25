import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY, catchError, finalize, of, switchMap } from 'rxjs';
import { DisruptionAnswerDTO } from '../disruption-answer.model';
import { DisruptionAnswerService } from '../disruption-answer.service';
import { AttachmentService } from '../../../admin/services/attachment.service';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { ACCEPTED_IMAGE_TYPES } from '../../../shared/utils/upload-types';

/** Mağazanın uyğunsuzluğa cavabı: status, açıqlama və şəkil. Uğurla göndəriləndə `true` ilə bağlanır. */
@Component({
  selector: 'app-answer-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './answer-form-dialog.component.html',
  styleUrl: './answer-form-dialog.component.scss',
})
export class AnswerFormDialogComponent {
  protected readonly row = inject<DisruptionAnswerDTO>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<AnswerFormDialogComponent, boolean>>(MatDialogRef);
  private readonly answerService = inject(DisruptionAnswerService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly notify = inject(NotificationService);

  /** Cavab statusu: serverin `answerStatus` dəyərləri. */
  protected readonly answerStatuses = [
    { value: '1', label: 'Həll edildi' },
    { value: '3', label: 'Razı deyiləm' },
  ];
  protected readonly acceptedImageTypes = ACCEPTED_IMAGE_TYPES;

  protected readonly form = new FormGroup({
    answerStatus: new FormControl('', { nonNullable: true, validators: Validators.required }),
    note: new FormControl(this.row.note ?? '', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] }),
    files: new FormControl<File[] | null>(null, Validators.required),
  });

  protected isSaving = false;

  protected get noteLength(): number {
    return this.form.controls.note.value.trim().length;
  }

  protected onFileChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    const control = this.form.controls.files;
    control.setValue(files.length ? files : null);
    control.markAsTouched();
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isSaving) return;

    const { answerStatus, note, files } = this.form.getRawValue();
    const answer = { id: this.row.id, answerStatus, note };

    // Əvvəl şəkil, sonra cavab: cavab zənciri növbəti səviyyəyə ötürür. Şəkil rədd edilsə
    // (format, ölçü) cavab da getməsin, istifadəçi düzəldib yenidən göndərsin.
    const upload$ = files?.length
      ? this.attachmentService.uploadAttachment(Module.DisAnswer, MediaType.Image, answer.id, files)
      : of(null);

    this.isSaving = true;
    upload$.pipe(
      catchError((error) => {
        this.notify.error(apiErrorMessage(error, 'Şəkil yüklənmədi, cavab göndərilmədi'));
        return EMPTY;
      }),
      switchMap(() => this.answerService.AddDisruptionAnswer(answer).pipe(
        catchError((error) => {
          this.notify.error(apiErrorMessage(error, 'Cavab göndərilmədi'));
          return EMPTY;
        })
      )),
      finalize(() => (this.isSaving = false))
    ).subscribe((response: { success: boolean; message?: string }) => {
      if (response.success) {
        this.notify.success('Cavab göndərildi');
        this.dialogRef.close(true);
      } else {
        this.notify.error(response.message || 'Cavab göndərilmədi');
      }
    });
  }
}

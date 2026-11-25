import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { SectionDto } from '../../../models/section.model';
import { SectionService } from '../../../services/section.service';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';

/** Yeni şöbə seçilmiş firmada yaranır; `item` verilsə redaktə. */
export interface SectionDialogData {
    firmId: number;
    item?: SectionDto;
}

/** Şöbə forması (dialoq). Nəticə: saxlanılıbsa `true`. */
@Component({
    selector: 'app-section-add',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
    templateUrl: './section-add.component.html',
    styleUrl: './section-add.component.scss'
})
export class SectionAddComponent implements OnInit {
    private readonly notify = inject(NotificationService);
    private readonly sectionService = inject(SectionService);
    private readonly firmService = inject(FirmService);
    private readonly dialogRef = inject<MatDialogRef<SectionAddComponent, boolean>>(MatDialogRef);
    private readonly data = inject<SectionDialogData>(MAT_DIALOG_DATA);

    readonly isEdit = !!this.data.item;
    firms: FirmDto[] = [];
    isSaving = false;

    readonly form = inject(FormBuilder).group({
        firmId: [this.data.firmId as number | null, Validators.required],
        sectionName: [this.data.item?.sectionName ?? '', Validators.required],
        sectionDescription: [this.data.item?.sectionDescription ?? '']
    });

    ngOnInit(): void {
        this.firmService.getAllFirms().subscribe({
            next: response => this.firms = Array.isArray(response?.data) ? response.data : [],
            error: err => this.notify.error(apiErrorMessage(err, 'Firmalar yüklənmədi'))
        });
    }

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const raw = this.form.getRawValue();
        const payload: Partial<SectionDto> = {
            firmId: raw.firmId!,
            sectionName: (raw.sectionName ?? '').trim(),
            sectionDescription: raw.sectionDescription ?? ''
        };
        const item = this.data.item;
        const request = item
            ? this.sectionService.update({ ...payload, id: item.id })
            : this.sectionService.create(payload);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(item ? 'Şöbə yeniləndi' : 'Şöbə əlavə edildi');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(apiErrorMessage(err, item ? 'Şöbə yenilənmədi' : 'Şöbə əlavə edilmədi'))
        });
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { SectionDto } from '../../../models/section.model';
import { CategoryService } from '../../../services/category.service';
import { CategoryDto } from '../../../models/category.model';

/** Şöbə seçimi yalnız açılan firmanın şöbələridir; `item` verilsə redaktə. */
export interface CategoryDialogData {
    sections: SectionDto[];
    /** Yeni kateqoriya üçün əvvəlcədən seçilən şöbə (siyahının şöbə filtri). */
    sectionId?: number;
    item?: CategoryDto;
}

/** Kateqoriya forması (dialoq). Nəticə: saxlanılıbsa `true`. */
@Component({
    selector: 'app-category-add',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
    templateUrl: './category-add.component.html',
    styleUrl: './category-add.component.scss'
})
export class CategoryAddComponent {
    private readonly notify = inject(NotificationService);
    private readonly categoryService = inject(CategoryService);
    private readonly dialogRef = inject<MatDialogRef<CategoryAddComponent, boolean>>(MatDialogRef);
    private readonly data = inject<CategoryDialogData>(MAT_DIALOG_DATA);

    readonly sections = this.data.sections;
    readonly isEdit = !!this.data.item;
    isSaving = false;

    readonly form = inject(FormBuilder).group({
        sectionId: [this.data.item?.sectionId ?? this.data.sectionId ?? null, Validators.required],
        categoryName: [this.data.item?.categoryName ?? '', Validators.required],
        categoryDescription: [this.data.item?.categoryDescription ?? '']
    });

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const raw = this.form.getRawValue();
        const payload = {
            sectionId: raw.sectionId!,
            categoryName: (raw.categoryName ?? '').trim(),
            categoryDescription: raw.categoryDescription ?? ''
        };
        const item = this.data.item;
        const request = item
            ? this.categoryService.updateCategory({ ...payload, id: item.id })
            : this.categoryService.createCategory(payload);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(item ? 'Kateqoriya yeniləndi' : 'Kateqoriya əlavə edildi');
                this.dialogRef.close(true);
            },
            error: err => this.notify.error(apiErrorMessage(err, item ? 'Kateqoriya yenilənmədi' : 'Kateqoriya əlavə edilmədi'))
        });
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

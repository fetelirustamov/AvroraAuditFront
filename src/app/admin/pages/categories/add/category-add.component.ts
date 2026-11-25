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
import { SectionService } from '../../../services/section.service';
import { SectionDto } from '../../../models/section.model';
import { CategoryService } from '../../../services/category.service';
import { CategoryDto } from '../../../models/category.model';

@Component({
    selector: 'app-category-add',
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
    templateUrl: './category-add.component.html',
    styleUrl: './category-add.component.scss'
})
export class CategoryAddComponent implements OnInit {
    form!: FormGroup;
    sections: SectionDto[] = [];

    pageTitle = 'Yeni Kateqoriya';
    isEditMode = false;
    isSaving = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private sectionService: SectionService,
        private categoryService: CategoryService,
        @Optional() private dialogRef?: MatDialogRef<CategoryAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: CategoryDto | { mode: 'edit', item: CategoryDto } | { sectionId?: number, sections?: SectionDto[] }
    ) {
        this.form = this.fb.group({
            sectionId: [null, Validators.required],
            categoryName: ['', Validators.required],
            categoryDescription: ['']
        });
    }

    ngOnInit(): void {
        const dialogData: any = this.data as any;

        if (dialogData?.sections && Array.isArray(dialogData.sections)) {
            // "Audit Strukturu" səhifəsindən firma konteksti ilə açılıb - yalnız həmin firmanın şöbələri
            this.sections = dialogData.sections;
        } else {
            this.sectionService.list().subscribe({
                next: response => {
                    if (response.success) {
                        this.sections = response.data;
                    }
                },
                error: e => this.notify.error(apiErrorMessage(e, 'Şöbələr yüklənmədi'))
            });
        }

        if (dialogData?.mode === 'edit' && dialogData?.item) {
            this.isEditMode = true;
            this.pageTitle = 'Kateqoriyanı Redaktə Et';
            this.form.patchValue({
                sectionId: dialogData.item.sectionId,
                categoryName: dialogData.item.categoryName,
                categoryDescription: dialogData.item.categoryDescription
            });
        } else if (dialogData?.sectionId) {
            this.form.patchValue({ sectionId: dialogData.sectionId });
        }
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
            this.categoryService.updateCategory({ ...payload, id })
                .pipe(finalize(() => this.isSaving = false))
                .subscribe({
                    next: res => {
                        this.notify.success('Kateqoriya uğurla redaktə edildi');
                        if (this.dialogRef) {
                            this.dialogRef.close({ updated: true, data: res });
                        } else {
                            this.router.navigate(['/admin/categories']);
                        }
                    },
                    error: e => this.notify.error(apiErrorMessage(e, 'Kateqoriya redaktə edilmədi'))
                });
            return;
        }

        this.categoryService.createCategory(payload)
            .pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: res => {
                    this.notify.success('Kateqoriya uğurla əlavə edildi');
                    if (this.dialogRef) {
                        this.dialogRef.close({ created: true, data: res });
                    } else {
                        this.router.navigate(['/admin/categories']);
                    }
                },
                error: e => this.notify.error(apiErrorMessage(e, 'Kateqoriya əlavə edilmədi'))
            });
    }

    cancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.router.navigate(['/admin/categories']);
        }
    }
} 
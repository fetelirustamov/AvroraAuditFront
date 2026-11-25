import { Component, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { UserService } from '../../../services/user.service';

export interface UserPasswordDialogData {
    userCode: number;
    fullName: string;
}

/** İki parol sahəsinin eyni olduğunu yoxlayır */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const repeatPassword = group.get('repeatPassword')?.value;
    return newPassword && repeatPassword && newPassword !== repeatPassword ? { passwordMismatch: true } : null;
}

/**
 * Admin tərəfindən parol sıfırlama. Mövcud parol nə göstərilir, nə də soruşulur —
 * yalnız yenisi təyin edilir. Kimlik formasından qəsdən ayrı saxlanılır ki,
 * "yadda saxla" düyməsi ilə təsadüfən parol dəyişməsin.
 */
@Component({
    selector: 'app-user-password-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    templateUrl: './user-password-dialog.component.html',
    styleUrl: './user-password-dialog.component.scss'
})
export class UserPasswordDialogComponent {
    form: FormGroup;
    isSaving = false;
    hideNew = true;
    hideRepeat = true;

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private notify: NotificationService,
        private dialogRef: MatDialogRef<UserPasswordDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: UserPasswordDialogData
    ) {
        this.form = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            repeatPassword: ['', Validators.required]
        }, { validators: passwordsMatchValidator });
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        try {
            await firstValueFrom(
                this.userService.updateUserPassword(this.data.userCode, {
                    newPassword: this.form.value.newPassword
                })
            );
            // Yeni parol bilərəkdən bildirişdə göstərilmir — ekranda qalmamalıdır.
            this.notify.success('Parol yeniləndi', {
                message: `${this.data.fullName} üçün yeni parol təyin edildi. Parolu istifadəçiyə özünüz çatdırın.`
            });
            this.dialogRef.close(true);
        } catch (err) {
            const status = err instanceof HttpErrorResponse ? err.status : 0;
            if (status === 409) {
                this.notify.error('Parol dəyişdirilə bilmədi', {
                    message: 'Bu istifadəçinin parolu kənar sistemdə (LDAP/OAuth) saxlanılır.'
                });
            } else if (status === 404) {
                this.notify.error('İstifadəçi tapılmadı');
            } else {
                this.notify.error('Parol yenilənmədi', {
                    message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.'
                });
            }
        } finally {
            this.isSaving = false;
        }
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

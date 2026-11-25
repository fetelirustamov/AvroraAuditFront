import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { UserService } from '../../../services/user.service';
import { AuthSettingService } from '../../../services/auth-setting.service';
import { FirmService } from '../../../services/firm.service';
import { RoleService } from '../../../services/role.service';
import { AuthSettingDto } from '../../../models/auth-setting.model';
import { UserCreateDto } from '../../../models/user.model';
import { FirmDto } from '../../../models/firm.model';
import { RoleDto } from '../../../models/role.model';

/** Dialoqun nəticəsi. `assigned: false`: istifadəçi yarandı, firma/qrup təyinatı alınmadı. */
export interface UserCreateResult {
    userCode: number;
    assigned: boolean;
}

/** mat-select multiple üçün "ən azı 1 seçim": Validators.required boş massivi keçərli sayır. */
function minSelectionValidator(control: AbstractControl): ValidationErrors | null {
    return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
}

/**
 * İstifadəçi yaratma (dialoq): şəxsi məlumatlar, parol, firmalar və icazə qrupu bir addımda.
 * Server iki sorğu ilə yazır: əvvəl istifadəçi, sonra təyinatlar.
 *
 * Autentifikasiya növü formada göstərilmir: mövcud növlərdən yerli (LocalDB) olan avtomatik seçilir.
 */
@Component({
    selector: 'app-user-create',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
    templateUrl: './user-create.component.html',
    styleUrl: './user-create.component.scss'
})
export class UserCreateComponent implements OnInit {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly notify = inject(NotificationService);
    private readonly userService = inject(UserService);
    private readonly authSettingService = inject(AuthSettingService);
    private readonly firmService = inject(FirmService);
    private readonly roleService = inject(RoleService);
    private readonly dialogRef = inject<MatDialogRef<UserCreateComponent, UserCreateResult>>(MatDialogRef);

    firms: FirmDto[] = [];
    roles: RoleDto[] = [];
    authSettingsMissing = false;
    isSaving = false;
    hidePassword = true;
    private authSettingId: string | null = null;

    readonly form = this.fb.group({
        userCode: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
        name: ['', [Validators.required, Validators.maxLength(150)]],
        surName: ['', [Validators.required, Validators.maxLength(150)]],
        fatherName: ['', Validators.maxLength(150)],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        firmIds: this.fb.control<number[]>([], minSelectionValidator),
        roleId: this.fb.control<number | null>(null, Validators.required)
    });

    ngOnInit(): void {
        this.authSettingService.getAllAuthSettings().subscribe({
            next: response => {
                const settings = response?.data ?? [];
                const setting = this.pickDefaultAuthSetting(settings);
                this.authSettingId = setting ? String(setting.id) : null;
                this.authSettingsMissing = !setting;
            },
            error: err => {
                this.authSettingsMissing = true;
                this.notify.error(apiErrorMessage(err, 'Autentifikasiya növləri yüklənmədi'));
            }
        });
        this.firmService.getAllFirms().subscribe({
            next: response => this.firms = Array.isArray(response?.data) ? response.data : [],
            error: err => this.notify.error(apiErrorMessage(err, 'Firmalar yüklənmədi'))
        });
        this.roleService.getAllRoles().subscribe({
            next: response => this.roles = Array.isArray(response?.data) ? response.data : [],
            error: err => this.notify.error(apiErrorMessage(err, 'İcazə qrupları yüklənmədi'))
        });
    }

    /** Adında "local/standart/defolt" keçən növ üstündür, tapılmasa siyahıdakı birinci. */
    private pickDefaultAuthSetting(settings: AuthSettingDto[]): AuthSettingDto | null {
        return settings.find(s => /local|standart|defolt|default/i.test(s.name)) ?? settings[0] ?? null;
    }

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (!this.authSettingId) {
            this.notify.error('İstifadəçi yaradıla bilməz', { message: 'Sistemdə autentifikasiya növü tapılmadı. İT dəstəyi ilə əlaqə saxlayın.' });
            return;
        }

        const raw = this.form.getRawValue();
        const userCode = Number(raw.userCode);
        const payload: UserCreateDto = {
            userCode,
            name: raw.name.trim(),
            surName: raw.surName.trim(),
            fatherName: raw.fatherName.trim() || undefined,
            position: '',
            email: raw.email.trim(),
            password: raw.password,
            authSettingId: this.authSettingId
        };

        this.isSaving = true;
        this.userService.createUser(payload).pipe(
            // İstifadəçi yarandı: təyinat xətası yaratmanı geri qaytarmır, nəticədə bildirilir
            switchMap(() => this.userService.updateUserAssignments(userCode, { status: 1, firmIds: raw.firmIds, roleId: raw.roleId! }).pipe(
                map(() => true),
                catchError(() => of(false))
            )),
            finalize(() => this.isSaving = false)
        ).subscribe({
            next: assigned => {
                if (assigned) {
                    this.notify.success('İstifadəçi əlavə edildi', { message: `${payload.name} ${payload.surName} (kod ${userCode})` });
                } else {
                    this.notify.warning('İstifadəçi yaradıldı, firma və qrup təyin edilmədi', {
                        message: 'Redaktə səhifəsi açılır: firmaları və icazə qrupunu orada yenidən seçin.'
                    });
                }
                this.dialogRef.close({ userCode, assigned });
            },
            // 409: kod və ya e-poçt artıq istifadə olunub - səbəb serverin mesajındadır
            error: err => this.notify.error(apiErrorMessage(err, 'İstifadəçi əlavə edilmədi'))
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }
}

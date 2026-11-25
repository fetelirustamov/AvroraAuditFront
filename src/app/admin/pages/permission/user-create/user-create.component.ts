import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { AdminBreadcrumbComponent } from '../../../shared/breadcrumb/admin-breadcrumb.component';
import { UserService } from '../../../services/user.service';
import { AuthSettingService } from '../../../services/auth-setting.service';
import { FirmService } from '../../../services/firm.service';
import { RoleService } from '../../../services/role.service';
import { AuthSettingDto } from '../../../models/auth-setting.model';
import { UserCreateDto } from '../../../models/user.model';
import { FirmDto } from '../../../models/firm.model';
import { RoleDto } from '../../../models/role.model';

/** mat-select multiple üçün "ən azı 1 seçim" validatoru - Validators.required boş array-i keçərli sayır */
function minSelectionValidator(control: AbstractControl): ValidationErrors | null {
    return Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
}

@Component({
    selector: 'app-user-create',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        AdminBreadcrumbComponent,
        AuditLoadingOverlayComponent
    ],
    templateUrl: './user-create.component.html',
    styleUrl: './user-create.component.scss'
})
export class UserCreateComponent implements OnInit {
    form: FormGroup;

    authSettings: AuthSettingDto[] = [];
    firms: FirmDto[] = [];
    roles: RoleDto[] = [];
    isLoading = false;
    isSaving = false;
    hidePassword = true;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private userService: UserService,
        private authSettingService: AuthSettingService,
        private firmService: FirmService,
        private roleService: RoleService,
        @Optional() private dialogRef?: MatDialogRef<UserCreateComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: unknown
    ) {
        this.form = this.fb.group({
            userCode: [null, [Validators.required, Validators.min(1)]],
            name: ['', [Validators.required, Validators.maxLength(150)]],
            surName: ['', [Validators.required, Validators.maxLength(150)]],
            fatherName: ['', Validators.maxLength(150)],
            email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            authSettingId: [null, Validators.required],
            firmIds: [[], minSelectionValidator],
            roleId: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.loadAuthSettings();
        this.loadFirms();
        this.loadRoles();
    }

    /** Dialoq kimi açılıbmı - şablonda breadcrumb-u gizlətmək üçün istifadə olunur */
    get isDialog(): boolean {
        return !!this.dialogRef;
    }

    get overlayTitle(): string {
        return this.isSaving ? 'Saxlanılır' : 'Məlumatlar yüklənir';
    }

    get overlayHint(): string {
        return this.isSaving ? 'İstifadəçi qeydi və təyinatlar yazılır…' : 'Forma hazırlanır…';
    }

    /**
     * "Autentifikasiya növü" sahəsi formadan gizlədilib (istifadəçi tələbi ilə) - burada
     * avtomatik olaraq mövcud dəyərlərdən uyğun defolt seçilir və arxa planda göndərilir.
     * Adında "local/standart/defolt" keçən variant üstünlük təşkil edir, tapılmasa siyahıdakı ilk dəyər istifadə olunur.
     */
    private loadAuthSettings(): void {
        this.isLoading = true;
        this.authSettingService.getAllAuthSettings().subscribe({
            next: response => {
                this.authSettings = response?.data ?? [];
                this.isLoading = false;

                const defaultSetting = this.pickDefaultAuthSetting(this.authSettings);
                if (defaultSetting) {
                    this.form.patchValue({ authSettingId: String(defaultSetting.id) });
                }
            },
            error: () => {
                this.authSettings = [];
                this.isLoading = false;
                this.notify.error('Autentifikasiya növü avtomatik təyin edilə bilmədi', {
                    message: 'Zəhmət olmasa İT dəstəyi ilə əlaqə saxlayın.'
                });
            }
        });
    }

    private pickDefaultAuthSetting(settings: AuthSettingDto[]): AuthSettingDto | null {
        if (settings.length === 0) return null;
        const preferred = settings.find(s => /local|standart|defolt|default/i.test(s.name));
        return preferred ?? settings[0];
    }

    private loadFirms(): void {
        this.firmService.getAllFirms().subscribe({
            next: (response: any) => {
                this.firms = Array.isArray(response?.data) ? response.data : [];
            },
            error: () => {
                this.firms = [];
                this.notify.error('Firmalar yüklənə bilmədi');
            }
        });
    }

    private loadRoles(): void {
        this.roleService.getAllRoles().subscribe({
            next: (response: any) => {
                this.roles = Array.isArray(response?.data) ? response.data : [];
            },
            error: () => {
                this.roles = [];
                this.notify.error('İcazə qrupları yüklənə bilmədi');
            }
        });
    }

    hasError(controlName: string, errorType: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.hasError(errorType) && control.touched;
    }

    async submit(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun (firma və icazə qrupu daxil).' });
            return;
        }

        const raw = this.form.getRawValue();
        const createPayload: UserCreateDto = {
            userCode: Number(raw.userCode),
            name: raw.name.trim(),
            surName: raw.surName.trim(),
            fatherName: raw.fatherName?.trim() || undefined,
            position: '',
            email: raw.email.trim(),
            password: raw.password,
            authSettingId: String(raw.authSettingId)
        };

        this.isSaving = true;
        this.userService.createUser(createPayload).subscribe({
            next: async () => {
                // İstifadəçi bazaya yazıldı - indi eyni əməliyyat daxilində firma(lar) və rolu təyin edirik,
                // ki "İstifadəçi İcazələri" siyahısında dərhal düzgün Müəssisə/Qrup görünsün.
                try {
                    await firstValueFrom(this.userService.updateUserAssignments(createPayload.userCode, {
                        status: 1,
                        firmIds: raw.firmIds,
                        roleId: raw.roleId
                    }));
                    this.isSaving = false;
                    this.notify.success('İstifadəçi uğurla əlavə edildi', {
                        message: `${createPayload.name} ${createPayload.surName} (kod: ${createPayload.userCode}) firma və rol təyinatı ilə birlikdə yaradıldı.`
                    });
                    if (this.dialogRef) {
                        this.dialogRef.close({ created: true });
                    } else {
                        this.router.navigate(['/admin/permissions/user-permission']);
                    }
                } catch {
                    this.isSaving = false;
                    this.notify.error('İstifadəçi yaradıldı, amma firma/rol təyinatı alınmadı', {
                        message: 'İndi "Rol və firma təyinatı" səhifəsindən əl ilə tamamlaya bilərsiniz.'
                    });
                    if (this.dialogRef) {
                        this.dialogRef.close({ created: true, userCode: createPayload.userCode });
                    } else {
                        this.router.navigate(['/admin/permissions/user-add'], {
                            queryParams: { userId: createPayload.userCode }
                        });
                    }
                }
            },
            error: (err: HttpErrorResponse) => {
                this.isSaving = false;
                // API 409 halında təkrarlanan e-poçt/kod mesajını qaytarır
                const message = err?.error?.message;
                this.notify.error(message || 'İstifadəçi əlavə edilə bilmədi. Zəhmət olmasa yenidən cəhd edin.');
            }
        });
    }

    cancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
        } else {
            this.router.navigate(['/admin/permissions/user-permission']);
        }
    }
}

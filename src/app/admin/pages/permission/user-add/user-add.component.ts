import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { concat, finalize, forkJoin, last } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { UserService } from '../../../services/user.service';
import { FirmService } from '../../../services/firm.service';
import { RoleService } from '../../../services/role.service';
import { UserDetail } from '../../../models/user.model';
import { FirmDto } from '../../../models/firm.model';
import { RoleDto } from '../../../models/role.model';
import { UserPasswordDialogComponent, UserPasswordDialogData } from '../user-password/user-password-dialog.component';

const LIST_URL = '/admin/permissions/user-permission';

/** Parolun bu sistemdə saxlandığı yeganə autentifikasiya növü. */
const LOCAL_AUTH_TYPE = 'LocalDB';

/** `/userdetails?userId=` cavabı massiv və ya tək obyekt ola bilər. */
function pickDetail(response: unknown): UserDetail | null {
    const data = (response as { data?: unknown } | null)?.data ?? response;
    if (Array.isArray(data)) return (data[0] as UserDetail) ?? null;
    return data && typeof data === 'object' ? data as UserDetail : null;
}

/**
 * İstifadəçi redaktəsi (`user-permission/:userCode`): şəxsi məlumatlar, status, firmalar, icazə qrupu.
 * Parol ayrıca dialoqda sıfırlanır: ümumi "Yadda saxla" ilə birləşsəydi, boş sahə parolu təsadüfən dəyişə bilərdi.
 * Yeni istifadəçi siyahıdakı dialoqla yaradılır.
 */
@Component({
    selector: 'app-user-add',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatProgressBarModule,
        PageHeaderComponent,
        ListStateComponent
    ],
    templateUrl: './user-add.component.html',
    styleUrl: './user-add.component.scss'
})
export class UserAddComponent implements OnInit {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly router = inject(Router);
    private readonly notify = inject(NotificationService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly userService = inject(UserService);
    private readonly firmService = inject(FirmService);
    private readonly roleService = inject(RoleService);
    private readonly dialog = inject(MatDialog);
    private readonly destroyRef = inject(DestroyRef);

    readonly userCode = Number(inject(ActivatedRoute).snapshot.paramMap.get('userCode'));

    firms: FirmDto[] = [];
    roles: RoleDto[] = [];
    fullName = '';
    /** AuthSettings.Name: parol sıfırlama yalnız LocalDB üçündür. */
    authType = '';
    isLoading = false;
    isSaving = false;
    loadError: string | null = null;

    readonly form = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        surName: ['', [Validators.required, Validators.maxLength(150)]],
        fatherName: ['', Validators.maxLength(150)],
        position: ['', Validators.maxLength(150)],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
        active: [true],
        // Firma yalnız aktiv istifadəçi üçün məcburidir (backend passiv istifadəçini firmasız qəbul edir)
        firmIds: this.fb.control<number[]>([], (control: AbstractControl): ValidationErrors | null =>
            control.parent?.get('active')?.value && !(control.value as number[]).length ? { required: true } : null),
        // Backend təyinatı qrupsuz qəbul etmir (RoleId <= 0 → 400)
        roleId: this.fb.control<number | null>(null, Validators.required)
    });

    get canResetPassword(): boolean {
        return this.authType === LOCAL_AUTH_TYPE;
    }

    ngOnInit(): void {
        this.form.controls.active.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.form.controls.firmIds.updateValueAndValidity());
        this.load();
    }

    load(): void {
        if (!Number.isFinite(this.userCode)) {
            this.loadError = 'İstifadəçi kodu düzgün deyil';
            return;
        }
        this.isLoading = true;
        this.loadError = null;
        forkJoin({
            detail: this.userService.getUserDetails(this.userCode),
            firms: this.firmService.getAllFirms(),
            roles: this.roleService.getAllRoles()
        })
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: ({ detail, firms, roles }) => {
                    this.firms = Array.isArray(firms?.data) ? firms.data : [];
                    this.roles = Array.isArray(roles?.data) ? roles.data : [];
                    const user = pickDetail(detail);
                    if (!user) {
                        this.loadError = 'İstifadəçi tapılmadı';
                        return;
                    }
                    this.prefill(user);
                },
                error: err => this.loadError = apiErrorMessage(err, 'İstifadəçi məlumatları yüklənmədi')
            });
    }

    private prefill(user: UserDetail): void {
        this.fullName = [user.name, user.surName, user.fatherName].filter(Boolean).join(' ');
        this.authType = user.authType ?? '';
        const roleId = user.roleId ?? this.roles.find(r => r.name === user.roleName)?.id ?? null;
        this.form.reset({
            name: user.name ?? '',
            surName: user.surName ?? '',
            fatherName: user.fatherName ?? '',
            position: user.position ?? '',
            email: user.email ?? '',
            active: user.status === 1,
            firmIds: user.firms?.map(f => f.firmId) ?? [],
            roleId
        });
    }

    openPasswordDialog(): void {
        this.dialog.open<UserPasswordDialogComponent, UserPasswordDialogData>(UserPasswordDialogComponent, {
            width: '460px',
            maxWidth: '95vw',
            disableClose: true,
            data: { userCode: this.userCode, fullName: this.fullName }
        });
    }

    save(): void {
        if (this.isSaving || this.isLoading) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Qırmızı ilə işarələnmiş sahələri doldurun.' });
            return;
        }
        const raw = this.form.getRawValue();
        const profile$ = this.userService.updateUserProfile(this.userCode, {
            name: raw.name.trim(),
            surName: raw.surName.trim(),
            fatherName: raw.fatherName.trim() || undefined,
            position: raw.position.trim() || undefined,
            email: raw.email.trim()
        });
        const assignments$ = this.userService.updateUserAssignments(this.userCode, {
            status: raw.active ? 1 : 0,
            firmIds: raw.firmIds,
            roleId: raw.roleId!
        });

        this.isSaving = true;
        // Əvvəl kimlik: e-poçt təkrarı (409) təyinatlara keçməyə qoymur, yarımçıq dəyişiklik qalmır
        concat(profile$, assignments$)
            .pipe(last(), finalize(() => this.isSaving = false))
            .subscribe({
                next: () => {
                    this.notify.success('İstifadəçi yeniləndi');
                    this.form.markAsPristine();
                    this.router.navigate([LIST_URL]);
                },
                error: err => this.notify.error(err instanceof HttpErrorResponse && err.status === 409
                    ? apiErrorMessage(err, 'Bu e-poçt başqa istifadəçiyə aiddir')
                    : apiErrorMessage(err, 'İstifadəçi yenilənmədi'))
            });
    }

    cancel(): void {
        if (!this.form.dirty) {
            this.router.navigate([LIST_URL]);
            return;
        }
        this.confirmDialog.confirm({
            title: 'Dəyişikliklər atılsın?',
            message: 'Saxlanmamış dəyişikliklər itəcək və geri qaytarılmayacaq. İstifadəçinin məlumatları əvvəlki kimi qalır.',
            confirmText: 'Dəyişiklikləri at',
            cancelText: 'Redaktəyə qayıt',
            tone: 'danger'
        }).subscribe(result => {
            if (result) this.router.navigate([LIST_URL]);
        });
    }
}

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { AuditLoadingOverlayComponent } from '../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { MatChipsModule } from '@angular/material/chips';
import { UserService } from '../../../services/user.service';
import { FirmService } from '../../../services/firm.service';
import { RoleService } from '../../../services/role.service';
import { firstValueFrom } from 'rxjs';
import { UserDto, UserDetail, UserAssignmentsPutDto, UserProfilePutDto } from '../../../models/user.model';
import { FirmDto } from '../../../models/firm.model';
import { RoleDto } from '../../../models/role.model';
import { AdminBreadcrumbComponent } from '../../../shared/breadcrumb/admin-breadcrumb.component';
import { UserPasswordDialogComponent } from '../user-password/user-password-dialog.component';

interface User {
    id: string;
    fullName: string;
    department: string;
    position: string;
    profileImage?: string;
    email?: string;
    phone?: string;
}

/** Parolun bu sistemdə saxlandığı yeganə autentifikasiya növü */
const LOCAL_AUTH_TYPE = 'LocalDB';

@Component({
    selector: 'app-user-add',
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
        MatSlideToggleModule,
        MatDialogModule,
        MatTooltipModule,
        AuditLoadingOverlayComponent,
        MatChipsModule,
        AdminBreadcrumbComponent
    ],
    templateUrl: './user-add.component.html',
    styleUrl: './user-add.component.scss'
})
export class UserAddComponent implements OnInit {
    @ViewChild('marketCard') marketCard?: ElementRef<HTMLElement>;
    @ViewChild('permissionCard') permissionCard?: ElementRef<HTMLElement>;
    @ViewChild('userSearchInput') userSearchInput?: ElementRef<HTMLInputElement>;

    // Form
    userForm: FormGroup;

    // Loading states
    isLoading: boolean = false;
    isSaving: boolean = false;

    // Edit mode flags
    isEditMode: boolean = false;
    isPrefilling: boolean = false;

    /**
     * Redaktə olunan istifadəçinin AuthSettings.Name dəyəri.
     * Parol sıfırlama düyməsi yalnız LocalDB üçün göstərilir.
     */
    authType: string = '';

    // User properties
    selectedUser: User | null = null;
    userStatus: boolean = false; // false = passive, true = active

    // Market properties - now directly bound to select
    selectedMarket: string[] = [];

    // Permission properties
    selectedPermissionGroup: string = '';

    // Select search (User)
    userSearchTerm: string = '';
    filteredUsers: User[] = [];

    // Loading state for dropdowns
    isLoadingUsers: boolean = false;
    isLoadingFirms: boolean = false;
    isLoadingRoles: boolean = false;

    // Data from API
    markets: string[] = [];
    firms: FirmDto[] = [];
    roles: RoleDto[] = [];
    permissionGroups: string[] = [];

    // Pending prefill (edit mode) — applied after firms+roles are loaded
    private pendingEditDetail: UserDetail | null = null;

    // Users from API
    users: User[] = [];

    get userAddOverlayTitle(): string {
        return this.isSaving ? 'Saxlanılır' : 'Məlumatlar yüklənir';
    }

    get userAddOverlayHint(): string {
        return this.isSaving ? 'İstifadəçi qeydi yazılır…' : 'Forma hazırlanır…';
    }

    get userAddCrumbs(): { label: string }[] {
        return [
            { label: 'İstifadəçi İdarəetməsi' },
            { label: 'Rol və Firma Təyinatı' },
            { label: this.isEditMode ? 'Redaktə' : 'Yeni' }
        ];
    }

    get saveButtonLabel(): string {
        return this.isSaving ? 'Saxlanılır...' : (this.isEditMode ? 'Yadda saxla' : 'Əlavə Et');
    }

    /** Kimlik sahələrinin qrupu — yalnız redaktə rejimində aktivdir */
    get profileGroup(): FormGroup {
        return this.userForm.get('profile') as FormGroup;
    }

    /** Parol yalnız LocalDB istifadəçiləri üçün bu sistemdə saxlanılır */
    get canResetPassword(): boolean {
        return this.isEditMode && this.authType === LOCAL_AUTH_TYPE;
    }

    /** LDAP/OAuth istifadəçisində parol düyməsi əvəzinə izahedici nişan göstərilir */
    get externalAuthLabel(): string {
        return `Parol ${this.authType} tərəfindən idarə olunur`;
    }

    hasProfileError(controlName: string, errorType: string): boolean {
        const control = this.profileGroup?.get(controlName);
        return control ? control.hasError(errorType) && control.touched : false;
    }

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private fb: FormBuilder,
        private notify: NotificationService,
        private confirmDialog: ConfirmDialogService,
        private userService: UserService,
        private firmService: FirmService,
        private roleService: RoleService,
        private dialog: MatDialog
    ) {
        this.userForm = this.fb.group({
            selectedUser: ['', Validators.required],
            userStatus: [false],
            selectedMarket: [[], Validators.required],
            selectedPermissionGroup: [''],
            // Kimlik sahələri yalnız redaktə rejimində dəyişdirilir. Yeni təyinat
            // rejimində qrup disable olunur — Angular disable qrupu validasiyadan
            // və getRawValue-dan kənar tutmur, ona görə ayrıca yoxlanılır.
            profile: this.fb.group({
                name: ['', [Validators.required, Validators.maxLength(150)]],
                surName: ['', [Validators.required, Validators.maxLength(150)]],
                fatherName: ['', Validators.maxLength(150)],
                position: ['', Validators.maxLength(150)],
                email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]]
            })
        });

        // Başlanğıc vəziyyət təyinat rejimidir; redaktə query param-ı gələndə açılır.
        this.profileGroup.disable({ emitEvent: false });
    }

    ngOnInit() {
        // Load data from services
        this.loadUsers();
        this.loadFirms();
        this.loadRoles();

        // Set up form value changes
        this.userForm.get('userStatus')?.valueChanges.subscribe(() => {
            this.onStatusChange();
        });

        this.userForm.get('selectedUser')?.valueChanges.subscribe(() => {
            if (!this.isPrefilling) {
                this.onUserChange();
            }
        });

        // Edit mode: userId query param gəlirsə API-dən detalları yüklə
        this.route.queryParamMap.subscribe(params => {
            const userId = params.get('userId');
            this.isEditMode = !!userId;
            const selectedCtrl = this.userForm.get('selectedUser');

            if (this.isEditMode) {
                selectedCtrl?.disable({ emitEvent: false });
                this.profileGroup.enable({ emitEvent: false });
            } else {
                selectedCtrl?.enable({ emitEvent: false });
                this.profileGroup.disable({ emitEvent: false });
            }

            if (!this.isEditMode) {
                return;
            }

            this.isLoading = true;
            this.isPrefilling = true;
            this.userService.getUserDetails(Number(userId)).subscribe({
                next: (response: any) => {
                    let detail: UserDetail | null = null;

                    if (response?.data && Array.isArray(response.data)) {
                        // Array formatı: { data: [{...}] }
                        detail = response.data[0] ?? null;
                    } else if (response?.data && !Array.isArray(response.data)) {
                        // Tək obyekt formatı: { data: {...} }
                        detail = response.data;
                    } else if (Array.isArray(response)) {
                        detail = response[0] ?? null;
                    }

                    if (detail) {
                        // Saxla, firms+roles yüklənəndə tətbiq et
                        this.pendingEditDetail = detail;
                        this.tryApplyPrefill();
                    } else {
                        this.isLoading = false;
                        this.isPrefilling = false;
                    }
                },
                error: () => {
                    this.isLoading = false;
                    this.isPrefilling = false;
                    this.showMessage('İstifadəçi məlumatları yüklənərkən xəta baş verdi', 'error');
                }
            });
        });
    }

    // Firms və roles tam yüklənəndən sonra edit formasını doldur
    private tryApplyPrefill() {
        if (!this.pendingEditDetail) return;
        if (this.isLoadingFirms || this.isLoadingRoles) return; // hələ gözlə

        const detail = this.pendingEditDetail;
        this.pendingEditDetail = null;
        this.prefillFromDetail(detail);
        this.isLoading = false;
        setTimeout(() => { this.isPrefilling = false; }, 0);
    }

    // Edit rejimində forma doldur
    private prefillFromDetail(detail: UserDetail) {
        const nameParts = [detail.name, detail.surName, detail.fatherName].filter(Boolean);
        const fullName = nameParts.length > 0 ? nameParts.join(' ') : `ID: ${detail.userCode ?? detail.id}`;

        const user: User = {
            id: detail.userCode ? String(detail.userCode) : String(detail.id),
            fullName,
            department: detail.department || '-',
            position: detail.position || '-',
            email: detail.email,
            phone: detail.phone,
            profileImage: detail.profileImage
        };

        const isActive = detail.status === 1;
        const markets = detail.firms?.map(f => f.firmName) ?? [];
        const firstGroup = detail.roleName ?? '';
        this.authType = detail.authType ?? '';

        // Komponent property-lərini birbaşa set et
        this.selectedUser = user;
        this.selectedMarket = markets;
        this.selectedPermissionGroup = firstGroup;

        // Əgər user hələ dropdown-da yoxdursa əlavə et
        const existingIdx = this.users.findIndex(u => u.id === user.id);
        if (existingIdx === -1) {
            this.users = [user, ...this.users];
        } else {
            this.users[existingIdx] = user; // məlumatları yenilə
        }
        this.filteredUsers = this.users.slice();

        // emitEvent:false — valueChanges tetiklenməsin, yan effekt olmasın
        this.userForm.patchValue({
            selectedUser: user,
            userStatus: isActive,
            selectedMarket: markets,
            selectedPermissionGroup: firstGroup,
            profile: {
                name: detail.name ?? '',
                surName: detail.surName ?? '',
                fatherName: detail.fatherName ?? '',
                position: detail.position ?? '',
                email: detail.email ?? ''
            }
        }, { emitEvent: false });
    }

    // Load users from API (getAllUsers endpoint)
    private loadUsers() {
        this.isLoadingUsers = true;
        this.userService.getAllUsers().subscribe({
            next: (response: any) => {
                let items: UserDto[] = [];

                if (response && Array.isArray(response.data)) {
                    items = response.data;
                } else if (response?.data?.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                } else if (Array.isArray(response)) {
                    items = response;
                }

                this.users = items.map(u => this.mapDtoToUser(u));
                this.filteredUsers = this.users.slice();
                this.isLoadingUsers = false;
            },
            error: () => {
                this.users = [];
                this.filteredUsers = [];
                this.isLoadingUsers = false;
            }
        });
    }

    // UserDto → local User interface
    private mapDtoToUser(dto: UserDto): User {
        const nameParts = [dto.name, dto.surName, dto.fatherName].filter(Boolean);
        const fullName = nameParts.length > 0
            ? nameParts.join(' ')
            : (dto.firstName ? `${dto.firstName} ${dto.lastName || ''}`.trim() : `ID: ${dto.userCode ?? dto.id}`);
        return {
            id: dto.userCode ? String(dto.userCode) : String(dto.id),
            fullName,
            department: dto.roleName || '-',
            position: dto.roleName || '-',
            email: dto.email,
            phone: dto.phone
        };
    }

    // Load firms from API
    private loadFirms() {
        this.isLoadingFirms = true;
        this.firmService.getAllFirms().subscribe({
            next: (response: any) => {
                let items: FirmDto[] = [];

                if (response && Array.isArray(response.data)) {
                    items = response.data;
                } else if (response?.data?.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                } else if (Array.isArray(response)) {
                    items = response;
                }

                this.firms = items;
                this.markets = items.map(f => f.name);
                this.isLoadingFirms = false;
                this.tryApplyPrefill();
            },
            error: () => {
                this.firms = [];
                this.markets = [];
                this.isLoadingFirms = false;
                this.tryApplyPrefill();
            }
        });
    }

    // Load roles from API
    private loadRoles() {
        this.isLoadingRoles = true;
        this.roleService.getAllRoles().subscribe({
            next: (response: any) => {
                let items: RoleDto[] = [];

                if (response && Array.isArray(response.data)) {
                    items = response.data;
                } else if (response?.data?.items && Array.isArray(response.data.items)) {
                    items = response.data.items;
                } else if (Array.isArray(response)) {
                    items = response;
                }

                this.roles = items;
                this.permissionGroups = items.map(r => r.name);
                this.isLoadingRoles = false;
                this.tryApplyPrefill();
            },
            error: () => {
                this.roles = [];
                this.permissionGroups = [];
                this.isLoadingRoles = false;
                this.tryApplyPrefill();
            }
        });
    }

    private smoothScrollTo(el?: ElementRef<HTMLElement>) {
        if (el?.nativeElement) {
            setTimeout(() => {
                el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    // Search inside user select
    onUserSelectOpened(opened: boolean) {
        if (opened) {
            this.userSearchTerm = '';
            this.filteredUsers = this.users.slice();
            setTimeout(() => this.userSearchInput?.nativeElement.focus(), 100);
        }
    }

    onUserSearchInput(value: string) {
        this.userSearchTerm = value;
        const term = value.toLowerCase().trim();
        if (!term) {
            this.filteredUsers = this.users.slice();
            return;
        }
        this.filteredUsers = this.users.filter(u =>
            u.id.toLowerCase().includes(term) || u.fullName.toLowerCase().includes(term)
        );
    }

    // User change handler
    onUserChange() {
        const user = this.userForm.get('selectedUser')?.value as User | null;
        if (user) {
            this.selectedUser = user;
            // Reset status to passive when new user is selected (only in create mode or manual change)
            if (!this.isEditMode) {
                this.userForm.patchValue({
                    userStatus: false,
                    selectedMarket: [],
                    selectedPermissionGroup: ''
                });
            }
            // Update selected markets based on user's current assignments (only when not prefilling from edit)
            if (!this.isEditMode) {
                this.updateSelectedMarkets(user);
            }
            // Scroll into view of Market card
            this.smoothScrollTo(this.marketCard);
        }
    }

    // Update selected markets based on user data
    updateSelectedMarkets(user: User) {
        // Find if department matches any firm name
        const matchedMarket = this.markets.find(m => user.department.includes(m));
        if (matchedMarket) {
            this.selectedMarket = [matchedMarket];
        } else {
            this.selectedMarket = [];
        }
        this.userForm.patchValue({ selectedMarket: this.selectedMarket });
    }

    // Search user functionality (for compatibility)
    searchUser() {
        if (!this.selectedUser) {
            this.showMessage('Zəhmət olmasa istifadəçi seçin', 'error');
            return;
        }
        this.showMessage(`İstifadəçi seçildi: ${this.selectedUser.fullName}`, 'success');
    }

    // Status change handler
    onStatusChange() {
        // Prefill və ya edit rejimində yan effektlərin qarşısını al
        if (this.isPrefilling || this.isEditMode) return;

        const status = this.userForm.get('userStatus')?.value as boolean;
        if (!status) {
            // Yalnız yeni istifadəçi əlavə edərkən sıfırla
            this.userForm.patchValue({
                selectedMarket: [],
                selectedPermissionGroup: ''
            });
            this.selectedMarket = [];
            this.selectedPermissionGroup = '';
        } else {
            // Scroll into view of Permission Group card when becomes active
            this.smoothScrollTo(this.permissionCard);
        }
    }

    // Clear helpers for suffix icons
    clearSelectedMarkets() {
        this.selectedMarket = [];
        this.userForm.patchValue({ selectedMarket: [] });
    }

    clearPermissionGroup() {
        this.selectedPermissionGroup = '';
        this.userForm.patchValue({ selectedPermissionGroup: '' });
    }

    // Add market functionality (now handled directly by select)
    addMarket() {
        // Bazar seçimi birbaşa mat-select tərəfindən idarə olunur, əlavə əməliyyat tələb olunmur.
    }

    // Show message
    showMessage(message: string, type: 'success' | 'error' | 'info' = 'info') {
        if (type === 'success') this.notify.success(message);
        else if (type === 'error') this.notify.error(message);
        else this.notify.info(message);
    }

    private buildAssignmentsPayload(formValue: {
        userStatus: boolean;
        selectedMarket: string[];
        selectedPermissionGroup: string;
    }): UserAssignmentsPutDto | null {
        const active = !!formValue.userStatus;
        const marketNames = [...(formValue.selectedMarket ?? [])];
        const firmIds = marketNames
            .map(name => this.firms.find(f => f.name === name)?.id)
            .filter((id): id is number => id !== undefined && id !== null);

        const roleName = (formValue.selectedPermissionGroup ?? '').trim();
        const roleId = this.roles.find(r => r.name === roleName)?.id ?? 0;

        if (active) {
            if (!marketNames.length || !roleName) return null;
            if (firmIds.length !== marketNames.length) return null;
            if (!roleId) return null;
        }

        return {
            status: active ? 1 : 0,
            firmIds,
            roleId
        };
    }

    private buildProfilePayload(): UserProfilePutDto {
        const profile = this.profileGroup.getRawValue();
        return {
            name: (profile.name ?? '').trim(),
            surName: (profile.surName ?? '').trim(),
            fatherName: (profile.fatherName ?? '').trim() || undefined,
            position: (profile.position ?? '').trim() || undefined,
            email: (profile.email ?? '').trim()
        };
    }

    /**
     * Parol sıfırlama kimlik formasından ayrı dialoqda aparılır — ümumi "yadda saxla"
     * ilə birləşsəydi, boş qalan sahə parolu təsadüfən sıfırlaya bilərdi.
     */
    openPasswordDialog() {
        if (!this.selectedUser) return;

        this.dialog.open(UserPasswordDialogComponent, {
            width: '460px',
            maxWidth: '95vw',
            disableClose: true,
            data: {
                userCode: Number(this.selectedUser.id),
                fullName: this.selectedUser.fullName
            }
        });
    }

    // Save user
    async saveUser() {
        const formValue = this.userForm.getRawValue();
        const selected = formValue.selectedUser as User | string | undefined | null;
        const hasValidUser =
            selected !== null &&
            selected !== undefined &&
            selected !== '' &&
            typeof selected === 'object' &&
            'id' in selected &&
            String((selected as User).id).trim().length > 0;

        if (!hasValidUser) {
            this.userForm.markAllAsTouched();
            this.showMessage('Zəhmət olmasa bütün məcburi sahələri doldurun', 'error');
            return;
        }

        if (this.userForm.invalid) {
            this.userForm.markAllAsTouched();
            this.showMessage('Zəhmət olmasa bütün məcburi sahələri doldurun', 'error');
            return;
        }

        const selectedUserObj = selected as User;

        if (formValue.userStatus && (!formValue.selectedMarket || formValue.selectedMarket.length === 0 || !formValue.selectedPermissionGroup)) {
            this.showMessage('Aktiv istifadəçi üçün market və səlahiyyət təyin edilməlidir', 'error');
            return;
        }

        const payload = this.buildAssignmentsPayload(formValue);
        if (!payload) {
            this.showMessage('Müəssisə və ya qrup seçimi düzgün deyil — bütün seçimlər siyahı ilə uyğun olmalıdır', 'error');
            return;
        }

        const userCode = Number(selectedUserObj.id);
        if (!Number.isFinite(userCode)) {
            this.showMessage('İstifadəçi kodu tapılmadı', 'error');
            return;
        }

        if (this.isEditMode) {
            this.isSaving = true;
            try {
                // Əvvəlcə kimlik: e-poçt təkrarı 409 qaytarsa təyinatlara heç keçmirik,
                // beləliklə uğursuz yadda saxlama yarımçıq dəyişiklik qoymur.
                await firstValueFrom(this.userService.updateUserProfile(userCode, this.buildProfilePayload()));
                await firstValueFrom(this.userService.updateUserAssignments(userCode, payload));
                this.showMessage('İstifadəçinin məlumatları və səlahiyyətləri yeniləndi', 'success');
                setTimeout(() => {
                    this.router.navigate(['/admin/permissions/user-permission']);
                }, 800);
            } catch (err) {
                if (err instanceof HttpErrorResponse && err.status === 409) {
                    this.showMessage('Bu e-poçt ünvanı başqa istifadəçiyə aiddir', 'error');
                } else {
                    this.showMessage('Yeniləmə mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.', 'error');
                }
            } finally {
                this.isSaving = false;
            }
            return;
        }

        this.isSaving = true;
        try {
            // Redaktə rejimi ilə eyni real API - istifadəçi burada axtarışla seçilir,
            // sonra ona firma(lar) və rol təyin edilir.
            await firstValueFrom(this.userService.updateUserAssignments(userCode, payload));
            this.showMessage('İstifadəçiyə firma və rol uğurla təyin edildi', 'success');
            setTimeout(() => {
                this.router.navigate(['/admin/permissions/user-permission']);
            }, 800);
        } catch {
            this.showMessage('Təyinat mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    // Cancel operation
    cancel() {
        if (this.userForm.dirty) {
            this.confirmDialog.confirm({
                title: 'Dəyişikliklər saxlanılmayacaq',
                message: 'Dəyişikliklər saxlanılmayacaq. Davam etmək istəyirsiniz?',
                confirmText: 'Bəli, davam et',
                cancelText: 'Ləğv et'
            }).subscribe(confirmed => {
                if (confirmed) {
                    this.router.navigate(['/admin/permissions/user-permission']);
                }
            });
        } else {
            this.router.navigate(['/admin/permissions/user-permission']);
        }
    }

    // Get form control
    getFormControl(controlName: string) {
        return this.userForm.get(controlName);
    }

    // Check if form control has error
    hasError(controlName: string, errorType: string): boolean {
        const control = this.getFormControl(controlName);
        return control ? control.hasError(errorType) && control.touched : false;
    }
}

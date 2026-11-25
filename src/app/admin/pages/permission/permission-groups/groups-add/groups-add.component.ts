import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, finalize, forkJoin, of } from 'rxjs';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../../shared/components/list-state/list-state.component';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { PageService } from '../../../../services/page.service';
import { RoleService } from '../../../../services/role.service';
import { PageDto } from '../../../../models/page.model';
import { RoleCreateDto, RoleDetailDto, RolePage, RoleUpdateDto } from '../../../../models/role.model';
import { pageMenuPlaces } from '../../../../shared/page-menu-sections';
import { adminPageRoutes } from '../../../../admin-pages.routes';
import { uiPageRoutes } from '../../../../../ui/ui-pages.routes';

type PermissionKey = 'show' | 'add' | 'edit' | 'delete';
type CrudKey = Exclude<PermissionKey, 'show'>;

type PermissionGroup = FormGroup<Record<PermissionKey, FormControl<boolean>>>;

interface PageRow {
    page: PageDto;
    group: PermissionGroup;
}

interface MatrixSection {
    label: string;
    rows: PageRow[];
}

const LIST_URL = '/admin/permissions/permission-groups';
const OTHER_SECTION = 'Menyuda olmayan səhifələr';

/**
 * İcazə qrupu forması (səhifə): yeni, redaktə və baxış (`view/:id`) rejimləri.
 *
 * Yalnız «Oxuma» (show) tətbiq olunur: menyu və `permissionGuard` onu yoxlayır, `*hasPermission`
 * heç bir şablonda işlənmir. Yaratma/dəyişmə/silmə saxlanılır, amma hələ heç nəyi gizlətmir:
 * matrisdə "hələ tətbiq olunmur" kimi işarələnib. Oxuma olmadan qalan icazələr mənasızdır,
 * ona görə «Oxuma» sönəndə onlar da sönür və bağlanır.
 */
@Component({
    selector: 'app-groups-add',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatProgressBarModule,
        PageHeaderComponent,
        ListStateComponent
    ],
    templateUrl: './groups-add.component.html',
    styleUrl: './groups-add.component.scss'
})
export class GroupsAddComponent implements OnInit {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly notify = inject(NotificationService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly pageService = inject(PageService);
    private readonly roleService = inject(RoleService);
    private readonly destroyRef = inject(DestroyRef);

    readonly crudColumns: { key: CrudKey; label: string }[] = [
        { key: 'add', label: 'Yaratma' },
        { key: 'edit', label: 'Dəyişmə' },
        { key: 'delete', label: 'Silmə' }
    ];

    readonly editId = this.route.snapshot.paramMap.has('id') ? Number(this.route.snapshot.paramMap.get('id')) : null;
    readonly isViewMode = (this.route.snapshot.routeConfig?.path ?? '').startsWith('permission-groups/view');
    readonly isEditMode = this.editId != null && !this.isViewMode;

    isLoading = false;
    isSaving = false;
    pageRows: PageRow[] = [];
    sections: MatrixSection[] = [];

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        rows: this.fb.array<PermissionGroup>([])
    });

    get shownCount(): number {
        return this.pageRows.filter(r => r.group.controls.show.value).length;
    }

    ngOnInit(): void {
        this.isLoading = true;
        const role$: Observable<RoleDetailDto | null> = this.editId != null ? this.roleService.getRoleById(this.editId) : of(null);
        forkJoin({ pages: this.pageService.list(), role: role$ })
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: ({ pages, role }) => {
                    if (role) {
                        this.form.patchValue({ name: role.roleName, description: role.roleDescription ?? '' });
                    }
                    this.buildRows(pages, role);
                    if (this.isViewMode) this.form.disable({ emitEvent: false });
                },
                error: err => this.notify.error(apiErrorMessage(err, 'İcazə qrupu yüklənmədi'))
            });
    }

    /** Səhifələri menyu bölmələrinə qruplaşdırır (route-ların `data.menu`-su ilə eyni sıra). */
    private buildRows(pages: PageDto[], role: RoleDetailDto | null): void {
        const places = pageMenuPlaces(uiPageRoutes, adminPageRoutes);
        const rows = this.form.controls.rows;
        rows.clear();

        this.pageRows = pages.map(page => {
            const existing = role?.pages?.find(p => p.pageId === page.id);
            const group: PermissionGroup = this.fb.group({
                show: [existing?.show ?? false],
                add: [existing?.add ?? false],
                edit: [existing?.edit ?? false],
                delete: [existing?.delete ?? false]
            });
            this.syncCrud(group, group.controls.show.value);
            group.controls.show.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(show => this.syncCrud(group, show));
            rows.push(group);
            return { page, group };
        });

        const bySection = new Map<string, { order: number; rows: (PageRow & { order: number })[] }>();
        for (const row of this.pageRows) {
            const place = places.get((row.page.key ?? '').toLowerCase());
            const label = place?.section ?? OTHER_SECTION;
            const entry = bySection.get(label) ?? { order: place?.sectionOrder ?? Number.MAX_SAFE_INTEGER, rows: [] };
            entry.rows.push({ ...row, order: place?.order ?? Number.MAX_SAFE_INTEGER });
            bySection.set(label, entry);
        }
        this.sections = [...bySection.entries()]
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([label, entry]) => ({
                label,
                rows: entry.rows
                    .sort((a, b) => a.order - b.order || a.page.name.localeCompare(b.page.name, 'az'))
                    .map(({ page, group }) => ({ page, group }))
            }));
    }

    /** Oxuma olmadan yaratma/dəyişmə/silmə mənasızdır: sönür və bağlanır. */
    private syncCrud(group: PermissionGroup, show: boolean): void {
        for (const { key } of this.crudColumns) {
            const control = group.controls[key];
            if (show) {
                if (!this.isViewMode) control.enable({ emitEvent: false });
            } else {
                control.setValue(false, { emitEvent: false });
                control.disable({ emitEvent: false });
            }
        }
    }

    /** Sütunda dəyişdirilə bilən sətirlər (CRUD sütunlarında yalnız oxuması açıq olanlar). */
    private columnRows(key: PermissionKey): PermissionGroup[] {
        return this.pageRows.map(r => r.group).filter(g => key === 'show' || g.controls.show.value);
    }

    isAllChecked(key: PermissionKey): boolean {
        const groups = this.columnRows(key);
        return groups.length > 0 && groups.every(g => g.controls[key].value);
    }

    isSomeChecked(key: PermissionKey): boolean {
        const groups = this.columnRows(key);
        return groups.some(g => g.controls[key].value) && !groups.every(g => g.controls[key].value);
    }

    toggleAllColumn(key: PermissionKey, checked: boolean): void {
        this.columnRows(key).forEach(g => g.controls[key].setValue(checked));
        this.form.markAsDirty();
    }

    save(): void {
        if (this.isViewMode || this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Qrupun adını yazın.' });
            return;
        }

        const raw = this.form.getRawValue();
        const rolePages: RolePage[] = this.pageRows.map(({ page, group }) => {
            const v = group.getRawValue();
            return { pageId: page.id, show: v.show ? 1 : 0, add: v.add ? 1 : 0, edit: v.edit ? 1 : 0, delete: v.delete ? 1 : 0 };
        });

        const request = this.isEditMode && this.editId != null
            ? this.roleService.updateRole(this.editId, { name: raw.name.trim(), description: raw.description, rolePages } as RoleUpdateDto)
            : this.roleService.createRole({ name: raw.name.trim(), description: raw.description, status: 1, rolePages } as RoleCreateDto);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(this.isEditMode ? 'İcazə qrupu yeniləndi' : 'İcazə qrupu yaradıldı');
                this.form.markAsPristine();
                this.router.navigate([LIST_URL]);
            },
            // 409: sistem qrupunun (Admin, Inspector, HeadInspector) adı dəyişdirilə bilməz
            error: err => this.notify.error(apiErrorMessage(err, this.isEditMode ? 'İcazə qrupu yenilənmədi' : 'İcazə qrupu yaradılmadı'))
        });
    }

    cancel(): void {
        if (!this.form.dirty) {
            this.router.navigate([LIST_URL]);
            return;
        }
        this.confirmDialog.confirm({
            title: 'Dəyişikliklər atılsın?',
            message: 'Saxlanmamış ad və icazə dəyişiklikləri itəcək və geri qaytarılmayacaq. Qrup əvvəlki kimi qalır.',
            confirmText: 'Dəyişiklikləri at',
            cancelText: 'Redaktəyə qayıt',
            tone: 'danger'
        }).subscribe(result => {
            if (result) this.router.navigate([LIST_URL]);
        });
    }
}

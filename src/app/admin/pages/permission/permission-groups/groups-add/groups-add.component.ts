import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { MatChipsModule } from '@angular/material/chips';
import { AuditLoadingOverlayComponent } from '../../../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { PageService } from '../../../../services/page.service';
import { RoleService } from '../../../../services/role.service';
import { PageDto } from '../../../../models/page.model';
import { RolePage, RolePageDetail, RoleCreateDto, RoleUpdateDto } from '../../../../models/role.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-groups-add',
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
    MatCheckboxModule,
    MatChipsModule,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './groups-add.component.html',
  styleUrl: './groups-add.component.scss'
})
export class GroupsAddComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  isViewMode = false;
  isLoading = false;
  pages: PageDto[] = [];
  private editId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private notify: NotificationService,
    private pageService: PageService,
    private roleService: RoleService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      code: [{ value: '', disabled: true }],
      name: ['', [Validators.required]],
      description: [''],
      rows: this.fb.array([])
    });

    // Route mode-u aşkarla
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 2]?.path || segments[segments.length - 1]?.path;
      this.isViewMode = last === 'view';
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editId = Number(id);
        this.isEditMode = !this.isViewMode;
        this.loadEditData(this.editId);
      } else {
        this.loadPages();
      }
    });
  }

  /** Yeni əlavə üçün — yalnız səhifələri yüklə */
  private loadPages(): void {
    this.isLoading = true;
    this.pageService.list().subscribe({
      next: pages => {
        this.pages = pages;
        this.buildRows(this.pages, []);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notify.error('Səhifələr yüklənmədi');
      }
    });
  }

  /** Redaktə / baxış üçün — paralel olaraq səhifələri və rolu yüklə */
  private loadEditData(id: number): void {
    this.isLoading = true;
    forkJoin({
      pages: this.pageService.list(),
      role: this.roleService.getRoleById(id)
    }).subscribe({
      next: ({ pages, role }) => {
        this.pages = pages;

        this.form.patchValue({
          code: String(role.roleId),
          name: role.roleName,
          description: role.roleDescription ?? ''
        });

        this.buildRows(this.pages, role.pages ?? []);

        if (this.isViewMode) {
          this.form.disable({ emitEvent: false });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[GroupsAdd] xəta:', err);
        this.isLoading = false;
        this.notify.error('Məlumatlar yüklənmədi');
      }
    });
  }

  /** Cədvəl sətrlərini API məlumatları əsasında qur */
  private buildRows(pages: PageDto[], rolePages: RolePageDetail[]): void {
    const rowsArray = this.form.get('rows') as FormArray;
    rowsArray.clear();

    pages.forEach(page => {
      const existing = rolePages.find(rp => rp.pageId === page.id);
      rowsArray.push(this.fb.group({
        pageId: [page.id],
        pageName: new FormControl({ value: page.name, disabled: true }),
        show: [existing?.show ?? false],
        add: [existing?.add ?? false],
        edit: [existing?.edit ?? false],
        delete: [existing?.delete ?? false]
      }));
    });
  }

  get rows(): FormArray { return this.form.get('rows') as FormArray; }

  /** Cədvəl başlığındakı "hamısını seç" checkbox-larının vəziyyəti */
  isAllChecked(column: 'show' | 'add' | 'edit' | 'delete'): boolean {
    return this.rows.length > 0 && this.rows.controls.every(r => r.get(column)?.value === true);
  }

  /** Bir sütun üzrə bütün sətirləri eyni anda işarələ/ləğv et */
  toggleAllColumn(column: 'show' | 'add' | 'edit' | 'delete', checked: boolean): void {
    this.rows.controls.forEach(r => r.get(column)?.setValue(checked));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
      return;
    }

    const raw = this.form.getRawValue();

    const rolePages: RolePage[] = raw.rows.map((r: any) => ({
      pageId: r.pageId,
      show: r.show ? 1 : 0,
      add: r.add ? 1 : 0,
      edit: r.edit ? 1 : 0,
      delete: r.delete ? 1 : 0
    }));

    if (this.isEditMode && this.editId) {
      const payload: RoleUpdateDto = {
        name: raw.name,
        description: raw.description,
        rolePages
      };
      this.roleService.updateRole(this.editId, payload).subscribe({
        next: () => {
          this.notify.success('Qrup uğurla yeniləndi');
          this.router.navigate(['/admin/permissions/permission-groups']);
        },
        error: () => this.notify.error('Yeniləmə zamanı xəta baş verdi')
      });
    } else {
      const payload: RoleCreateDto = {
        name: raw.name,
        description: raw.description,
        status: 1,
        rolePages
      };
      this.roleService.createRole(payload).subscribe({
        next: () => {
          this.notify.success('Qrup uğurla yaradıldı');
          this.router.navigate(['/admin/permissions/permission-groups']);
        },
        error: () => this.notify.error('Yaratma zamanı xəta baş verdi')
      });
    }
  }

  cancel(): void { this.router.navigate(['/admin/permissions/permission-groups']); }
  goBack(): void { this.router.navigate(['/admin/permissions/permission-groups']); }
}

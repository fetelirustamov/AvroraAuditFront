import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { MatChipsModule } from '@angular/material/chips';
import { PageService } from '../../services/page.service';
import { PageDto } from '../../models/page.model';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    AuditLoadingOverlayComponent,
    MatChipsModule,
    AdminBreadcrumbComponent
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss'
})
export class PageComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['index', 'name', 'key', 'status', 'actions'];
  dataSource: MatTableDataSource<PageDto>;

  rows: PageDto[] = [];
  isLoading = false;
  isEditMode = false;
  isSaving = false;
  editingId: number | null = null;
  searchTerm = '';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private pageService: PageService,
    private confirmDialog: ConfirmDialogService,
    private notify: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<PageDto>([]);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      key: ['', [Validators.required, Validators.minLength(2)]],
    });
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private load(): void {
    this.isLoading = true;
    this.pageService.list().subscribe({
      next: (res: any) => {
        let items: PageDto[] = [];
        if (res && Array.isArray(res.data)) {
          items = res.data;
        } else if (res?.data?.items && Array.isArray(res.data.items)) {
          items = res.data.items;
        } else if (Array.isArray(res)) {
          items = res;
        }
        this.rows = items;
        this.dataSource.data = items;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notify.error('Məlumatlar yüklənərkən xəta baş verdi');
      }
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
      return;
    }

    // Redaktədə açar disabled-dir, getRawValue onu yenə də (dəyişməmiş) göndərir
    const { name, key } = this.form.getRawValue();
    const payload = { name, key, status: 1 };

    this.isSaving = true;
    if (this.isEditMode && this.editingId !== null) {
      this.pageService.update(this.editingId, { ...payload, id: this.editingId })
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.notify.success('Səhifə uğurla yeniləndi');
            this.resetForm();
            this.load();
          },
          error: (e) => this.notify.error(apiErrorMessage(e, 'Yeniləmə zamanı xəta baş verdi'))
        });
    } else {
      this.pageService.create(payload)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.notify.success('Səhifə uğurla əlavə edildi');
            this.resetForm();
            this.load();
          },
          error: (e) => this.notify.error(apiErrorMessage(e, 'Əlavə etmə zamanı xəta baş verdi'))
        });
    }
  }

  edit(row: PageDto): void {
    this.isEditMode = true;
    this.editingId = row.id;
    this.form.patchValue({ name: row.name, key: row.key });
    // Açar route-dakı pageKey və rol icazələri ilə bağlıdır: dəyişsə səhifə hamıdan gizlənir
    this.form.get('key')!.disable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  remove(row: PageDto): void {
    this.confirmDialog.confirm({
      title: 'Səhifə silinsin?',
      message: `"${row.name}" (${row.key}) səhifəsi silinəcək. Bu səhifəyə icazəsi olan hər kəsin menyusundan itəcək.`,
      confirmText: 'Sil',
      tone: 'danger'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.pageService.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Səhifə uğurla silindi');
          if (this.editingId === row.id) this.resetForm();
          this.load();
        },
        error: (e) => this.notify.error(apiErrorMessage(e, 'Silmə zamanı xəta baş verdi'))
      });
    });
  }

  resetForm(): void {
    this.form.reset();
    this.form.get('key')!.enable();
    this.isEditMode = false;
    this.editingId = null;
  }

  getStatusLabel(status: number): string {
    return status === 1 ? 'Aktiv' : 'Deaktiv';
  }
}

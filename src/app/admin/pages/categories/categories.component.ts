import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CategoryAddComponent } from './add/category-add.component';
import { CategoryService } from '../../services/category.service';
import { CategoryDto } from '../../models/category.model';
import { SectionService } from '../../services/section.service';
import { SectionDto } from '../../models/section.model';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    AdminBreadcrumbComponent,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() showBreadcrumb = true;
  /** Verilse, komponent bu firmaya kilidlenir: yalnız bu firmanın şöbelerine aid kateqoriyalar gosterilir (Audit Strukturu sehifesinden istifade ucun). */
  @Input() firmId: number | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['section', 'categoryName', 'actions'];
  dataSource: MatTableDataSource<CategoryDto>;
  pageSize = 10;

  rows: CategoryDto[] = [];
  allRows: CategoryDto[] = [];
  sectionsForFirm: SectionDto[] = [];
  selectedSectionId: number | null = null;

  isLoading = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private categoryService: CategoryService,
    private sectionService: SectionService,
    private confirmDialog: ConfirmDialogService,
    private notify: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<CategoryDto>(this.rows);
  }

  ngOnInit(): void {
    if (this.firmId != null) {
      this.loadSectionsForFirm();
    }
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['firmId'] && !changes['firmId'].firstChange) {
      this.selectedSectionId = null;
      this.loadSectionsForFirm();
      this.applyFirmFilter();
    }
  }

  private loadSectionsForFirm(): void {
    if (this.firmId == null) {
      this.sectionsForFirm = [];
      return;
    }
    this.sectionService.getByFirmId(this.firmId).subscribe({
      next: (response) => {
        this.sectionsForFirm = Array.isArray(response?.data) ? response.data : [];
        this.applyFirmFilter();
      },
      error: () => {
        this.sectionsForFirm = [];
        this.applyFirmFilter();
      }
    });
  }

  onSectionFilterChange(): void {
    this.applyFirmFilter();
  }

  private applyFirmFilter(): void {
    if (this.firmId == null) {
      this.rows = [...this.allRows];
    } else {
      const validSectionIds = new Set(this.sectionsForFirm.map(s => s.id));
      this.rows = this.allRows.filter(r => r.sectionId != null && validSectionIds.has(r.sectionId));
      if (this.selectedSectionId != null) {
        this.rows = this.rows.filter(r => r.sectionId === this.selectedSectionId);
      }
    }
    this.dataSource.data = this.rows;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  private load() {
    this.isLoading = true;
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        const data = Array.isArray(response?.data) ? response.data : [];
        this.allRows = data;
        this.applyFirmFilter();
        this.isLoading = false;
      },
      error: () => {
        this.allRows = [];
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
        this.notify.error('Kateqoriyalar yüklənmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onPageSizeChange() {
    if (this.dataSource.paginator) {
      this.dataSource.paginator.pageSize = this.pageSize;
      this.dataSource.paginator.firstPage();
    }
  }

  add() {
    const dialogData = this.firmId != null
      ? { sections: this.sectionsForFirm, sectionId: this.selectedSectionId ?? undefined }
      : undefined;
    const dialogRef = this.dialog.open(CategoryAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.created) this.load();
    });
  }

  edit(row: CategoryDto) {
    const dialogRef = this.dialog.open(CategoryAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog',
      data: { mode: 'edit', item: row }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.updated) this.load();
    });
  }

  remove(row: CategoryDto) {
    this.confirmDialog.confirm({
      title: 'Kateqoriya silinsin?',
      message: `"${row.categoryName}" kateqoriyasını silmək istədiyinizə əminsiniz?`,
      confirmText: 'Bəli, sil',
      cancelText: 'Ləğv et'
    })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.categoryService.deleteCategory(row.id).subscribe({
          next: () => {
            this.notify.success('Kateqoriya silindi');
            this.load();
          },
          error: () => {
            this.notify.error('Kateqoriya silinmədi', { message: 'Bu kateqoriya istifadə olunur və ya serverlə əlaqədə xəta baş verdi.' });
          }
        });
      });
  }
}

import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';

// type CategoryRow = CategoryDto;

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
export class CategoriesComponent implements OnInit, AfterViewInit {
  @Input() showBreadcrumb = true;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['section', 'categoryName', 'description', 'actions'];
  dataSource: MatTableDataSource<CategoryDto>;
  pageSize = 10;

  rows: CategoryDto[] = [];

  isLoading = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private categoryService: CategoryService,
    private confirmDialog: ConfirmDialogService
  ) {
    this.dataSource = new MatTableDataSource<CategoryDto>(this.rows);
  }

  ngOnInit(): void {
    this.load();
  }

  private load() {
    this.isLoading = true;
    this.categoryService.getAllCategories().subscribe({
      next: (response) => {
        const data = Array.isArray(response?.data) ? response.data : [];
        this.rows = data;
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: () => {
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
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
    const dialogRef = this.dialog.open(CategoryAddComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog'
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
        this.categoryService.deleteCategory(row.id).subscribe(() => this.load());
      });
  }
  view(row: CategoryDto) { console.log('view', row); }
}

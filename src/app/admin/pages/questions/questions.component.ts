import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
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
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { CategoryService } from '../../services/category.service';
import { CategoryDto } from '../../models/category.model';
import { QuestionDto } from '../../models/question.model';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';

type QuestionRow = QuestionDto;

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.scss'
})
export class QuestionsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['order', 'type', 'question', 'actions'];
  dataSource: MatTableDataSource<QuestionRow>;
  pageSize = 10;

  rows: QuestionRow[] = [];
  categories: CategoryDto[] = [];

  // Advanced search
  searchForm!: FormGroup;
  private searchDialogRef?: MatDialogRef<any>;
  @ViewChild('searchTpl') searchTpl!: TemplateRef<any>;

  isLoading = false;

  constructor(
    private router: Router,
    private questionService: QuestionService,
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private confirmDialog: ConfirmDialogService,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<QuestionRow>(this.rows);
  }

  ngOnInit(): void {
    this.load();
    this.searchForm = this.fb.group({
      type: [null],
      question: [''],
      categoryId: [null]
    });
    this.loadCategories();
  }

  private load() {
    this.isLoading = true;
    this.questionService.list().subscribe({
      next: (response: any) => {

        let items: QuestionRow[] = [];

        // 1) Backend: { success, message, data: [...] }
        if (response && Array.isArray(response.data)) {
          items = response.data as QuestionRow[];
        }
        // 2) Backend: { success, message, data: { items: [...] } }
        else if (response?.data?.items && Array.isArray(response.data.items)) {
          items = response.data.items as QuestionRow[];
        }
        // 3) Fallback: birbaşa array gəlirsə
        else if (Array.isArray(response)) {
          items = response as QuestionRow[];
        }

        this.rows = items;
        this.dataSource.data = items;
        this.isLoading = false;
      },
      error: (error) => {
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
      }
    });
  }

  private loadCategories(): void {
    this.categoryService.getAllCategories().subscribe((response) => {
      if ((response as any)?.success !== false && Array.isArray(response.data)) {
        this.categories = response.data;
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openModal(tpl: TemplateRef<any>): void {
    this.searchDialogRef = this.dialog.open(tpl, {
      width: '400px',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'right-panel'
    });
    this.searchDialogRef?.afterClosed().subscribe(() => { });
  }

  closeModal(): void {
    this.searchDialogRef?.close();
  }

  onSearchSubmit(): void {
    const { type, question, categoryId } = this.searchForm.getRawValue();
    const categoryName = this.categories.find(c => c.id === categoryId)?.categoryName || '';
    const term = [type, question, categoryName]
      .filter(Boolean)
      .join(' ')
      .toString()
      .toLowerCase();
    this.dataSource.filter = term;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.closeModal();
  }

  resetForm(): void {
    this.searchForm.reset();
    this.dataSource.filter = '';
  }

  add() { this.router.navigate(['/admin/questions/add']); }
  edit(row: QuestionRow) { this.router.navigate(['/admin/questions/edit', row.id], { state: row }); }
  remove(row: QuestionRow) {
    this.confirmDialog
      .confirm({
        title: 'Sual silinsin?',
        message: `"${row.questionText}" sualını silmək istədiyinizə əminsiniz?`,
        confirmText: 'Bəli, sil',
        cancelText: 'Ləğv et'
      })
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.questionService.delete(row.id).subscribe(() => this.load());
      });
  }
  view(row: QuestionRow) { this.router.navigate(['/admin/questions/view', row.id], { state: row }); }
}

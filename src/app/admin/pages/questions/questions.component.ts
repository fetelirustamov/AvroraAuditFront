import { AfterViewInit, Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, finalize, forkJoin, merge } from 'rxjs';
import { QuestionService } from '../../services/question.service';
import { CategoryService } from '../../services/category.service';
import { SectionService } from '../../services/section.service';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { QUESTION_TYPES, QuestionDto, questionTypeLabel, toQuestionTypeId } from '../../models/question.model';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, queryString } from '../../../shared/utils/query-state';
import { TableUrlState } from '../../shared/table-url-state';
import { CategoryOption, categoryOptions } from '../../shared/category-options';

interface QuestionRow extends QuestionDto {
  /** "Şöbə › Kateqoriya" */
  path: string;
  firmId: number | null;
  typeId: number | null;
  typeLabel: string;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    PageHeaderComponent,
    ListStateComponent
  ],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.scss'
})
export class QuestionsComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly questionService = inject(QuestionService);
  private readonly categoryService = inject(CategoryService);
  private readonly sectionService = inject(SectionService);
  private readonly firmService = inject(FirmService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['order', 'path', 'question', 'typeLabel', 'actions'];
  readonly dataSource = new MatTableDataSource<QuestionRow>([]);
  readonly urlState = new TableUrlState(this.router, this.route);
  readonly questionTypes = QUESTION_TYPES;

  private readonly query = this.route.snapshot.queryParamMap;
  readonly filters = inject(FormBuilder).group({
    firm: [queryNumber(this.query, 'firm')],
    category: [queryNumber(this.query, 'category')],
    type: [queryNumber(this.query, 'type')],
    q: [queryString(this.query, 'q') ?? '']
  });

  firms: FirmDto[] = [];
  private allCategories: CategoryOption[] = [];
  private allRows: QuestionRow[] = [];

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  /** Kateqoriya seçimi firmaya görə süzülür. */
  get categoryOptions(): CategoryOption[] {
    const firmId = this.filters.controls.firm.value;
    return firmId == null ? this.allCategories : this.allCategories.filter(c => c.firmId === firmId);
  }

  get hasFilters(): boolean {
    const v = this.filters.getRawValue();
    return v.firm != null || v.category != null || v.type != null || !!v.q?.trim();
  }

  constructor() {
    this.dataSource.sortingDataAccessor = (row, column) =>
      column === 'order' ? (row.order ?? row.questionLine ?? 0) : String((row as unknown as Record<string, unknown>)[column] ?? '');
  }

  ngOnInit(): void {
    const { firm, category, type, q } = this.filters.controls;
    // Firma dəyişəndə başqa firmanın kateqoriyası seçili qalmasın
    firm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(firmId => {
      const selected = this.allCategories.find(c => c.id === category.value);
      if (firmId != null && selected && selected.firmId !== firmId) category.setValue(null, { emitEvent: false });
    });
    merge(firm.valueChanges, category.valueChanges, type.valueChanges, q.valueChanges.pipe(debounceTime(250)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFiltersChange());
    this.load();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;
    forkJoin({
      questions: this.questionService.list(),
      categories: this.categoryService.getAllCategories(),
      sections: this.sectionService.list(),
      firms: this.firmService.getAllFirms()
    })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: ({ questions, categories, sections, firms }) => {
          this.firms = Array.isArray(firms?.data) ? firms.data : [];
          this.allCategories = categoryOptions(
            Array.isArray(categories?.data) ? categories.data : [],
            Array.isArray(sections?.data) ? sections.data : []
          );
          const categoryById = new Map(this.allCategories.map(c => [c.id, c]));
          this.allRows = (Array.isArray(questions?.data) ? questions.data : []).map(q => {
            const category = categoryById.get(q.categoryId);
            const typeValue = q.questionType ?? q.questionTypeID;
            return {
              ...q,
              path: category?.path ?? q.categoryName ?? '—',
              firmId: category?.firmId ?? null,
              typeId: toQuestionTypeId(typeValue),
              typeLabel: questionTypeLabel(typeValue)
            };
          });
          this.applyFilters();
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.data.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Suallar yüklənmədi')
      });
  }

  clearFilters(): void {
    this.filters.reset({ firm: null, category: null, type: null, q: '' }, { emitEvent: false });
    this.onFiltersChange();
  }

  private onFiltersChange(): void {
    this.applyFilters();
    this.paginator.firstPage();
    const v = this.filters.getRawValue();
    this.urlState.writeFilters({ firm: v.firm, category: v.category, type: v.type, q: v.q?.trim() });
  }

  private applyFilters(): void {
    const { firm, category, type, q } = this.filters.getRawValue();
    const search = (q ?? '').trim().toLocaleLowerCase('az');
    this.dataSource.data = this.allRows.filter(r =>
      (firm == null || r.firmId === firm)
      && (category == null || r.categoryId === category)
      && (type == null || r.typeId === type)
      && (!search || (r.questionText ?? '').toLocaleLowerCase('az').includes(search)));
  }

  add(): void {
    this.router.navigate(['/admin/questions/add']);
  }

  edit(row: QuestionRow): void {
    this.router.navigate(['/admin/questions/edit', row.id]);
  }

  view(row: QuestionRow): void {
    this.router.navigate(['/admin/questions/view', row.id]);
  }

  remove(row: QuestionRow): void {
    this.confirmDialog.confirm({
      title: 'Sual silinsin?',
      message: 'Sual mobil checklist-dən çıxacaq və yeni yoxlamalarda soruşulmayacaq. Keçmiş yoxlama nəticələri dəyişmir. '
        + 'Admin panelindən geri qaytarmaq olmur.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [`${row.path}: ${row.questionText}`]
    }).subscribe(result => {
      if (!result) return;
      this.questionService.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Sual silindi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'Sual silinmədi'))
      });
    });
  }
}

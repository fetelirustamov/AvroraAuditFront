import { AfterViewInit, Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, finalize, forkJoin } from 'rxjs';
import { CategoryAddComponent, CategoryDialogData } from './add/category-add.component';
import { CategoryService } from '../../services/category.service';
import { CategoryDto } from '../../models/category.model';
import { SectionService } from '../../services/section.service';
import { SectionDto } from '../../models/section.model';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, queryString } from '../../../shared/utils/query-state';
import { TableUrlState } from '../../shared/table-url-state';
import { MASTER_DATA_QUERY } from '../master-data/master-data-query';

const KEYS = MASTER_DATA_QUERY.categories;

/**
 * "Audit strukturu" səhifəsinin "Kateqoriyalar" tabı: seçilmiş firmanın şöbələrinə aid kateqoriyalar.
 * Kateqoriyanın firması yoxdur, firma şöbə vasitəsilə müəyyən olunur.
 */
@Component({
  selector: 'app-categories',
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
    ListStateComponent
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit, OnChanges, AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly categoryService = inject(CategoryService);
  private readonly sectionService = inject(SectionService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) firmId!: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['sectionName', 'categoryName', 'actions'];
  readonly dataSource = new MatTableDataSource<CategoryDto>([]);
  readonly urlState = new TableUrlState(inject(Router), this.route, KEYS.page);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, KEYS.search) ?? '', { nonNullable: true });
  readonly sectionControl = new FormControl<number | null>(queryNumber(this.route.snapshot.queryParamMap, KEYS.section));

  /** Bütün kateqoriyalar (API firmaya görə süzmür); cədvəldə firmanın şöbələrinə aid olanlar qalır. */
  private allCategories: CategoryDto[] = [];
  sections: SectionDto[] = [];

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  get hasFilters(): boolean {
    return !!this.searchControl.value.trim() || this.sectionControl.value != null;
  }

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFiltersChange());
    this.sectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFiltersChange());
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Firma dəyişəndə filtrlər sıfırlanır (URL-i səhifə özü təmizləyir).
    // Səhifə hadisəsiz sıfırlanır: paginator-un page hadisəsi səhifənin firma naviqasiyasını əvəz edərdi.
    if (changes['firmId'] && !changes['firmId'].firstChange) {
      this.searchControl.setValue('', { emitEvent: false });
      this.sectionControl.setValue(null, { emitEvent: false });
      this.paginator.pageIndex = 0;
      this.loaded = false;
      this.dataSource.data = [];
      this.load();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;
    forkJoin({
      categories: this.categoryService.getAllCategories(),
      sections: this.sectionService.getByFirmId(this.firmId)
    })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: ({ categories, sections }) => {
          this.allCategories = Array.isArray(categories?.data) ? categories.data : [];
          // Firmanın şöbəsi yoxdursa API 204 qaytarır: gövdə boşdur
          this.sections = Array.isArray(sections?.data) ? sections.data : [];
          this.applyFilters();
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.data.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Kateqoriyalar yüklənmədi')
      });
  }

  private onFiltersChange(): void {
    this.applyFilters();
    this.paginator.firstPage();
    this.urlState.writeFilters({ [KEYS.search]: this.searchControl.value.trim(), [KEYS.section]: this.sectionControl.value });
  }

  private applyFilters(): void {
    const sectionIds = new Set(this.sections.map(s => s.id));
    const sectionId = this.sectionControl.value;
    const search = this.searchControl.value.trim().toLocaleLowerCase('az');
    this.dataSource.data = this.allCategories.filter(c =>
      c.sectionId != null && sectionIds.has(c.sectionId)
      && (sectionId == null || c.sectionId === sectionId)
      && (!search || c.categoryName.toLocaleLowerCase('az').includes(search)));
  }

  add(): void {
    this.openDialog({ sections: this.sections, sectionId: this.sectionControl.value ?? undefined });
  }

  edit(row: CategoryDto): void {
    this.openDialog({ sections: this.sections, item: row });
  }

  private openDialog(data: CategoryDialogData): void {
    this.dialog.open<CategoryAddComponent, CategoryDialogData, boolean>(CategoryAddComponent, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      data
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(row: CategoryDto): void {
    this.confirmDialog.confirm({
      title: 'Kateqoriya silinsin?',
      message: 'Kateqoriya şöbənin siyahısından çıxacaq. İçindəki suallar ayrıca silinmir, keçmiş yoxlama nəticələri dəyişmir. '
        + 'Admin panelindən geri qaytarmaq olmur.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [`${row.sectionName ?? '—'} › ${row.categoryName}`]
    }).subscribe(result => {
      if (!result) return;
      this.categoryService.deleteCategory(row.id).subscribe({
        next: () => {
          this.notify.success('Kateqoriya silindi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'Kateqoriya silinmədi'))
      });
    });
  }
}

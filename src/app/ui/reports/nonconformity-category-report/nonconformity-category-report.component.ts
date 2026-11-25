import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { chartColors } from '../../../shared/utils/chart-colors';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { MONTH_OPTIONS, PAGE_SIZES, REPORT_YEARS } from '../report-filters';
import { ReportsService } from '../reports.service';
import {
    NonconformityCategoryItem,
    NonconformityCategoryReportData,
    NonconformityCategoryRow,
} from './nonconformity-category-report.model';

/** Cədvəl sütunu → API filtr açarı */
const COLUMN_TO_API_FILTER: Record<string, string> = {
    bolge: 'regionName',
    magaza_kodu: 'locationCode',
    magaza_adi: 'locationName',
    sobeler: 'sectionName',
    uygunsuzluq_tasnifat: 'categoryName',
    say_sobe: 'sectionCount',
    say_tasnifat: 'categoryCount',
};

// Menyuda deyil (qəsdən, bax CLAUDE.md): yalnız URL ilə açılır.
@Component({
    selector: 'app-uygunsuzluq-tasnifat-hesabati',
    standalone: true,
    imports: [
        NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, ReactiveFormsModule,
        MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatMenuModule, MatProgressBarModule,
        PageHeaderComponent, ListStateComponent,
    ],
    templateUrl: './nonconformity-category-report.component.html',
    styleUrl: './nonconformity-category-report.component.scss',
})
export class UygunsuzluqTasnifatHesabatiComponent implements OnInit {
    private readonly reportsService = inject(ReportsService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly notify = inject(NotificationService);
    private readonly fileExport = inject(FileExportService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    columns = [
        { key: 'row', label: '№' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'magaza_kodu', label: 'Mağaza kodu' },
        { key: 'magaza_adi', label: 'Mağaza adı' },
        { key: 'sobeler', label: 'Şöbələr' },
        { key: 'uygunsuzluq_tasnifat', label: 'Uyğunsuzluq təsnifatı' },
        { key: 'say_sobe', label: 'Şöbələr üzrə uyğunsuzluq sayı' },
        { key: 'say_tasnifat', label: 'Uyğunsuzluq təsnifatı üzrə uyğunsuzluq sayı' },
    ];
    displayedColumns = this.columns.map(c => c.key);
    get filterColumns(): string[] { return this.columns.map(c => c.key + '__filter'); }
    dataSource = new MatTableDataSource<NonconformityCategoryRow>([]);
    allCount = 0;
    totalSaySobe = 0;
    totalSayTasnifat = 0;

    readonly years = REPORT_YEARS;
    readonly months = MONTH_OPTIONS;
    readonly pageSizes = PAGE_SIZES;
    readonly filtersForm = new FormGroup({
        year: new FormControl<number | null>(REPORT_YEARS[0]),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });
    firms: Firm[] = [];
    readonly filterInputClass = 'uygunsuzluq-tasnifat-filter-input';

    searched = false;
    isLoading = false;
    isExporting = false;
    loadError: string | null = null;
    pageIndex = 0;
    pageSize = PAGE_SIZES[0];

    private readonly tableState = new TableState();
    private columnApiFilters: Record<string, string> = {};
    private readonly columnFilterSubject = new Subject<{ key: string; value: string }>();

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnApiFilters).length > 0;
    }

    constructor() {
        this.columnFilterSubject.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(({ key, value }) => {
            this.applyColumnFilterDebounced(key, value);
        });
    }

    ngOnInit(): void {
        this.inspectionsService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: error => { this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi')); },
        });

        // URL-də il varsa əvvəlki axtarış bərpa olunur
        const q = this.route.snapshot.queryParamMap;
        const year = queryNumber(q, 'year');
        if (year == null) return;
        this.filtersForm.patchValue({ year, month: queryNumber(q, 'month'), firmId: queryNumber(q, 'firm') });
        this.pageIndex = queryNumber(q, 'page') ?? 0;
        this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];
        this.fetch();
    }

    applyColumnFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim();
        this.columnFilterSubject.next({ key, value });
    }

    private applyColumnFilterDebounced(displayKey: string, value: string): void {
        const apiKey = COLUMN_TO_API_FILTER[displayKey];
        if (!apiKey) { return; }
        if (value) {
            this.columnApiFilters[apiKey] = value;
        } else {
            delete this.columnApiFilters[apiKey];
        }
        if (!this.searched) { return; }
        this.pageIndex = 0;
        this.fetch();
    }

    clearColumnFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>(`.${this.filterInputClass}`).forEach(i => { i.value = ''; });
        if (!this.searched) { return; }
        this.pageIndex = 0;
        this.fetch();
    }

    onSearch(): void {
        this.pageIndex = 0;
        const { year, month, firmId } = this.filtersForm.getRawValue();
        void writeQueryState(this.router, { year, month, firm: firmId, page: null });
        this.fetch();
    }

    /** "Təmizlə": filtrlər standart dəyərə qayıdır, nəticə və URL təmizlənir */
    clearAll(): void {
        this.filtersForm.reset({ year: REPORT_YEARS[0], month: null, firmId: null });
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>(`.${this.filterInputClass}`).forEach(i => { i.value = ''; });
        this.searched = false;
        this.loadError = null;
        this.resetSummary();
        void writeQueryState(this.router, { year: null, month: null, firm: null, page: null, size: null });
    }

    onPage(e: PageEvent): void {
        this.pageIndex = e.pageIndex;
        this.pageSize = e.pageSize;
        void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
        this.fetch();
    }

    private syncFilterPayload(): void {
        const { year, month, firmId } = this.filtersForm.getRawValue();
        const formFilters: Record<string, string> = {};

        if (year != null) { formFilters['year'] = String(year); }
        if (month != null) { formFilters['month'] = String(month); }
        if (firmId != null) { formFilters['firmId'] = String(firmId); }

        this.tableState.filter = { ...formFilters, ...this.columnApiFilters };
        this.tableState.searchTerm = '';
        this.tableState.paginator.page = this.pageIndex;
        this.tableState.paginator.size = this.pageSize;
    }

    fetch(): void {
        this.searched = true;
        this.isLoading = true;
        this.loadError = null;
        this.syncFilterPayload();
        this.reportsService.getNonconformityCategoryDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    const data = this.normalizeData(res?.data);
                    this.allCount = data.total;
                    this.totalSaySobe = data.totalSectionCount;
                    this.totalSayTasnifat = data.totalCategoryCount;
                    const start = this.pageIndex * this.pageSize;
                    this.dataSource.data = data.items.map((item, idx) => this.mapRow(item, start + idx + 1));
                },
                error: error => {
                    this.loadError = apiErrorMessage(error, 'Hesabat yüklənmədi. İnternet bağlantısını və ya icazəni yoxlayın.');
                },
            });
    }

    private resetSummary(): void {
        this.dataSource.data = [];
        this.allCount = 0;
        this.totalSaySobe = 0;
        this.totalSayTasnifat = 0;
    }

    private normalizeData(data: NonconformityCategoryReportData | undefined): NonconformityCategoryReportData {
        return {
            items: data?.items ?? [],
            total: data?.total ?? 0,
            totalSectionCount: data?.totalSectionCount ?? 0,
            totalCategoryCount: data?.totalCategoryCount ?? 0,
        };
    }

    private mapRow(item: NonconformityCategoryItem, rowNo: number): NonconformityCategoryRow {
        return {
            row: rowNo,
            bolge: item.regionName ?? '—',
            magaza_kodu: item.locationCode,
            magaza_adi: item.locationName ?? '—',
            sobeler: item.sectionName ?? '—',
            uygunsuzluq_tasnifat: item.categoryName ?? '—',
            say_sobe: item.sectionCount,
            say_tasnifat: item.categoryCount,
        };
    }

    exportExcel(): void {
        this.exportWithAllRows(rows => {
            const data = rows.map(r => ({
                '№': r.row,
                'Bölgə': r.bolge,
                'Mağaza kodu': r.magaza_kodu,
                'Mağaza adı': r.magaza_adi,
                'Şöbələr': r.sobeler,
                'Uyğunsuzluq təsnifatı': r.uygunsuzluq_tasnifat,
                'Şöbələr üzrə uyğunsuzluq sayı': r.say_sobe,
                'Uyğunsuzluq təsnifatı üzrə uyğunsuzluq sayı': r.say_tasnifat,
            }));
            void this.fileExport.exportRowsToExcel(
                data,
                'Uyğunsuzluq təsnifatı',
                datedFileName('uygunsuzluq-tesnifati', 'xlsx'),
            );
        });
    }

    exportPdf(): void {
        this.exportWithAllRows(rows => {
            const labels = this.columns.map(c => c.label);
            const body = rows.map(r =>
                this.columns.map(c => ({ text: String(r[c.key as keyof NonconformityCategoryRow] ?? ''), fontSize: 7 })));
            // PDF-də başlıq neytraldır: rəng məna daşımır
            const pdf = chartColors();
            const docDef = {
                pageOrientation: 'landscape' as const,
                content: [{
                    table: {
                        headerRows: 1,
                        widths: Array(labels.length).fill('auto'),
                        body: [labels.map(h => ({ text: h, style: 'th' })), ...body],
                    },
                    layout: 'lightHorizontalLines',
                }],
                styles: { th: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 8 } },
                defaultStyle: { fontSize: 7 },
            };
            void this.fileExport.exportPdf(docDef, datedFileName('uygunsuzluq-tesnifati', 'pdf'));
        });
    }

    /** İxrac cari səhifəni deyil, filtrə uyğun bütün sətirləri götürür. */
    private exportWithAllRows(onReady: (rows: NonconformityCategoryRow[]) => void): void {
        if (!this.searched || this.allCount === 0) {
            this.notify.error('İxrac üçün məlumat yoxdur', { message: 'Əvvəlcə «Axtar» düyməsini basın.' });
            return;
        }

        this.syncFilterPayload();
        const state = new TableState();
        state.filter = { ...this.tableState.filter };
        state.searchTerm = '';
        state.paginator.page = 0;
        state.paginator.size = this.allCount;

        this.isExporting = true;
        this.reportsService.getNonconformityCategoryDetails(state)
            .pipe(finalize(() => { this.isExporting = false; }))
            .subscribe({
                next: res => {
                    const rows = this.normalizeData(res?.data).items.map((item, idx) => this.mapRow(item, idx + 1));
                    if (!rows.length) {
                        this.notify.error('İxrac üçün məlumat tapılmadı');
                        return;
                    }
                    onReady(rows);
                },
                error: error => {
                    this.notify.error(apiErrorMessage(error, 'İxrac üçün məlumat yüklənmədi'));
                },
            });
    }
}

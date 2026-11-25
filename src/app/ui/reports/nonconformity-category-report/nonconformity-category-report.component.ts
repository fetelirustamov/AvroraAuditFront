import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, finalize, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { TableState } from '../../../models/table-state.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { ReportsService } from '../reports.service';
import {
    NonconformityCategoryItem,
    NonconformityCategoryReportData,
    NonconformityCategoryRow,
} from './nonconformity-category-report.model';
import { chartColors } from '../../../shared/utils/chart-colors';

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

@Component({
    selector: 'app-uygunsuzluq-tasnifat-hesabati',
    standalone: true,
    imports: [
        CommonModule, NgIf, NgFor, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatSelectModule,
        MatTableModule, MatPaginatorModule, MatMenuModule,
        AuditLoadingOverlayComponent,
    ],
    templateUrl: './nonconformity-category-report.component.html',
    styleUrl: './nonconformity-category-report.component.scss',
})
export class UygunsuzluqTasnifatHesabatiComponent implements OnDestroy {
    @ViewChild(MatPaginator) paginator!: MatPaginator;

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
    dataSource = new MatTableDataSource<NonconformityCategoryRow>([]);
    allCount = 0;
    totalSaySobe = 0;
    totalSayTasnifat = 0;

    filtersForm = new FormGroup({
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });

    firms: Firm[] = [];
    readonly filterInputClass = 'uygunsuzluq-tasnifat-filter-input';

    years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    months = [
        { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' },
        { value: 3, label: 'Mart' }, { value: 4, label: 'Aprel' },
        { value: 5, label: 'May' }, { value: 6, label: 'İyun' },
        { value: 7, label: 'İyul' }, { value: 8, label: 'Avqust' },
        { value: 9, label: 'Sentyabr' }, { value: 10, label: 'Oktyabr' },
        { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' },
    ];

    hasSubmittedSearch = false;
    isLoading = false;
    isExporting = false;
    pageIndex = 0;
    pageSize = 10;

    readonly tableState = new TableState();
    private columnApiFilters: Record<string, string> = {};

    private readonly destroy$ = new Subject<void>();
    private readonly columnFilterSubject = new Subject<{ key: string; value: string }>();

    get filterColumns(): string[] {
        return this.columns.map(c => c.key + '__filter');
    }

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnApiFilters).length > 0;
    }

    constructor(
        private reportsService: ReportsService,
        private inspectionsService: InspectionsService,
        private notify: NotificationService,
        private fileExport: FileExportService,
    ) {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = this.pageSize;

        this.inspectionsService.getFirms().pipe(takeUntil(this.destroy$)).subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: () => { this.notify.error('Firmalar yüklənmədi'); },
        });

        this.columnFilterSubject.pipe(
            debounceTime(400),
            takeUntil(this.destroy$),
        ).subscribe(({ key, value }) => {
            this.applyColumnFilterDebounced(key, value);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
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
        if (!this.hasSubmittedSearch) { return; }
        this.resetToFirstPage();
        this.fetch();
    }

    clearFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>(`.${this.filterInputClass}`).forEach(i => { i.value = ''; });
        if (!this.hasSubmittedSearch) { return; }
        this.resetToFirstPage();
        this.fetch();
    }

    onSearch(): void {
        this.hasSubmittedSearch = true;
        this.resetToFirstPage();
        this.fetch();
    }

    onPage(e: PageEvent): void {
        if (!this.hasSubmittedSearch) { return; }
        this.pageIndex = e.pageIndex;
        this.pageSize = e.pageSize;
        this.fetch();
    }

    private resetToFirstPage(): void {
        this.pageIndex = 0;
        this.paginator?.firstPage();
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

    private fetch(): void {
        this.isLoading = true;
        this.syncFilterPayload();
        this.reportsService.getNonconformityCategoryDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }))
            .subscribe({
                next: res => {
                    const data = this.normalizeData(res?.data);
                    this.allCount = data.total;
                    this.totalSaySobe = data.totalSectionCount;
                    this.totalSayTasnifat = data.totalCategoryCount;
                    const start = this.pageIndex * this.pageSize;
                    this.dataSource.data = data.items.map((item, idx) => this.mapRow(item, start + idx + 1));
                },
                error: () => {
                    this.notify.error('Hesabat yüklənmədi', { message: 'İnternet bağlantısını və ya icazəni yoxlayın.' });
                    this.resetSummary();
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

    /** Export cari səhifəni deyil, filtrə uyğun bütün sətirləri götürür. */
    private exportWithAllRows(onReady: (rows: NonconformityCategoryRow[]) => void): void {
        if (!this.hasSubmittedSearch || this.allCount === 0) {
            this.notify.error('İxrac üçün məlumat yoxdur', { message: 'Əvvəlcə "Axtar" düyməsini basın.' });
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
                error: () => {
                    this.notify.error('İxrac üçün məlumat yüklənmədi', { message: 'İnternet bağlantısını və ya icazəni yoxlayın.' });
                },
            });
    }
}

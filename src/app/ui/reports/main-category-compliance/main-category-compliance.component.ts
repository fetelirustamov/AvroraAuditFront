import { NgFor, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
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
import { Subject, Subscription, debounceTime, finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { ComplianceTonePipe } from '../../../shared/pipes/compliance-tone.pipe';
import { ComplianceLegendComponent } from '../../../shared/components/compliance-legend/compliance-legend.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { chartColors } from '../../../shared/utils/chart-colors';
import { weightedPercent } from '../../../shared/utils/compliance';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { ReportsService } from '../reports.service';
import { MONTH_OPTIONS, PAGE_SIZES, REPORT_YEARS } from '../report-filters';

const COLUMN_TO_API_FILTER: Record<string, string> = {
    esas_tasnifat: 'categoryName',
    magaza_kodu: 'locationCode',
    magaza_adi: 'locationName',
    bolge: 'regionName',
    agirlig_bal_cemi: 'totalNormative',
    faktiki_bal: 'totalScore',
    faiz_nisbeti: 'percentage',
};

@Component({
    selector: 'app-esas-tasnifat-uygunlugu',
    standalone: true,
    imports: [
        NgIf, NgClass, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, ReactiveFormsModule,
        MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatMenuModule, MatProgressBarModule,
        PageHeaderComponent, ListStateComponent, ComplianceTonePipe, ComplianceLegendComponent,
    ],
    templateUrl: './main-category-compliance.component.html',
    styleUrl: './main-category-compliance.component.scss'
})
export class EsasTasnifatUygunluguComponent implements OnInit {
    private readonly inspectionsService = inject(InspectionsService);
    private readonly reportsService = inject(ReportsService);
    private readonly notify = inject(NotificationService);
    private readonly fileExport = inject(FileExportService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    columns = [
        { key: 'row', label: '№' },
        { key: 'esas_tasnifat', label: 'Əsas təsnifat' },
        { key: 'magaza_kodu', label: 'Mağaza kodu' },
        { key: 'magaza_adi', label: 'Mağaza adı' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'faktiki_bal', label: 'Faktiki toplanan bal' },
        { key: 'agirlig_bal_cemi', label: 'Təsnifat üzrə ağırlıq balın cəmi' },
        { key: 'faiz_nisbeti', label: 'Faiz nisbəti (%)' },
    ];
    displayedColumns = this.columns.map(c => c.key);
    get filterColumns(): string[] { return this.columns.map(c => c.key + '__filter'); }
    dataSource = new MatTableDataSource<any>([]);
    allCount = 0;

    readonly years = REPORT_YEARS;
    readonly months = MONTH_OPTIONS;
    readonly pageSizes = PAGE_SIZES;
    readonly filtersForm = new FormGroup({
        year: new FormControl<number | null>(REPORT_YEARS[0]),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });
    firms: Firm[] = [];

    readonly tableState = new TableState();
    private columnFilterSubject = new Subject<{ key: string; value: string }>();
    /** Filter açarları backend sıralama sütun adları ilə uyğun (categoryName, …) */
    private columnApiFilters: Record<string, string> = {};
    /** Filtrə uyğun bütün sətirlər; axtarışdan əvvəl və yüklənərkən null-dır (ixrac bağlıdır) */
    allRows: any[] | null = null;
    /** Çəkili orta: Σ faktiki bal / Σ ağırlıq balı × 100 */
    avgFaiz: number | null = null;
    private allRowsSub?: Subscription;

    searched = false;
    isLoading = false;
    loadError: string | null = null;

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnApiFilters).length > 0;
    }

    constructor() {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = PAGE_SIZES[0];
        this.tableState.sorting.column = 'categoryName';
        this.tableState.sorting.direction = 'asc';
        this.tableState.searchTerm = '';

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
        this.tableState.paginator.page = queryNumber(q, 'page') ?? 0;
        this.tableState.paginator.size = queryNumber(q, 'size') ?? PAGE_SIZES[0];
        this.load();
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
        this.search();
    }

    clearColumnFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.filter-input').forEach(i => { i.value = ''; });
        if (!this.searched) { return; }
        this.search();
    }

    onSearch(): void {
        this.search();
    }

    /** "Təmizlə": filtrlər standart dəyərə qayıdır, nəticə və URL təmizlənir */
    clearAll(): void {
        this.filtersForm.reset({ year: REPORT_YEARS[0], month: null, firmId: null });
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.filter-input').forEach(i => { i.value = ''; });
        this.allRowsSub?.unsubscribe();
        this.searched = false;
        this.loadError = null;
        this.dataSource.data = [];
        this.allCount = 0;
        this.allRows = null;
        this.avgFaiz = null;
        void writeQueryState(this.router, { year: null, month: null, firm: null, page: null, size: null });
    }

    /** Filtr dəyişdi: cədvəl ilk səhifədən, orta faiz və ixrac məlumatı bütün sətirlərdən yenilənir */
    private search(): void {
        this.tableState.paginator.page = 0;
        const { year, month, firmId } = this.filtersForm.getRawValue();
        void writeQueryState(this.router, { year, month, firm: firmId, page: null });
        this.load();
    }

    /** Cari səhifə və bütün sətirlər (orta faiz, ixrac) birlikdə yüklənir */
    load(): void {
        this.syncFilterPayload();
        this.fetch();
        this.loadAllRows();
    }

    onPage(e: PageEvent): void {
        this.tableState.paginator.page = e.pageIndex;
        this.tableState.paginator.size = e.pageSize;
        void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
        this.syncFilterPayload();
        this.fetch();
    }

    private getFormFilters(): Record<string, string> {
        const f: Record<string, string> = {};
        const { year, month, firmId } = this.filtersForm.getRawValue();
        if (year != null) { f['year'] = String(year); }
        if (month != null) { f['month'] = String(month); }
        if (firmId != null) { f['firmId'] = String(firmId); }
        return f;
    }

    private syncFilterPayload(): void {
        this.tableState.filter = { ...this.getFormFilters(), ...this.columnApiFilters };
    }

    private fetch(): void {
        this.searched = true;
        this.isLoading = true;
        this.loadError = null;
        this.reportsService.getCategoryScoreDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    const items = (res as any)?.data?.items ?? [];
                    const total = (res as any)?.data?.total;
                    this.allCount = typeof total === 'number' ? total : items.length;
                    const page = this.tableState.paginator.page;
                    const size = this.tableState.paginator.size;
                    this.dataSource.data = (items as any[]).map((item, idx) =>
                        this.mapApiRow(item, page * size + idx + 1));
                },
                error: error => {
                    this.loadError = apiErrorMessage(error, 'Hesabat yüklənmədi');
                },
            });
    }

    /**
     * Filtrə uyğun bütün sətirlər (page = -1 serverdə səhifələməni söndürür).
     * Cədvəl serverdə səhifələnir, ona görə orta faiz və ixrac cari səhifədən yox, buradan götürülür.
     */
    private loadAllRows(): void {
        this.allRowsSub?.unsubscribe();
        this.allRows = null;
        this.avgFaiz = null;
        const state = { ...this.tableState, paginator: { ...this.tableState.paginator, page: -1 } } as TableState;
        this.allRowsSub = this.reportsService.getCategoryScoreDetails(state).subscribe({
            next: res => {
                const items: any[] = (res as any)?.data?.items ?? [];
                this.allRows = items.map((item, idx) => this.mapApiRow(item, idx + 1));
                this.avgFaiz = weightedPercent(this.allRows, 'faktiki_bal', 'agirlig_bal_cemi');
            },
            error: error => this.notify.error(apiErrorMessage(error, 'Orta faiz və ixrac məlumatı yüklənmədi')),
        });
    }

    private mapApiRow(item: any, rowNo: number): any {
        const norm = item?.totalNormative ?? item?.TotalNormative;
        const score = item?.totalScore ?? item?.TotalScore;
        let pct = item?.percentage ?? item?.Percentage;
        if (pct == null && norm != null && Number(norm) !== 0) {
            pct = (Number(score) / Number(norm)) * 100;
        }
        const faiz = pct != null ? Number(Number(pct).toFixed(1)) : 0;
        return {
            row: rowNo,
            esas_tasnifat: item?.categoryName ?? item?.CategoryName ?? '',
            magaza_kodu: item?.locationCode ?? item?.LocationCode ?? '',
            magaza_adi: item?.locationName ?? item?.LocationName ?? '',
            bolge: item?.regionName ?? item?.RegionName ?? '',
            agirlig_bal_cemi: norm ?? '',
            faktiki_bal: score ?? '',
            faiz_nisbeti: faiz,
        };
    }

    get avgFaizLabel(): string {
        if (this.allRows === null) { return '…'; }
        return this.avgFaiz === null ? '—' : `${this.avgFaiz.toFixed(1)}%`;
    }

    exportExcel(): void {
        if (!this.allRows) { return; }
        const data = this.allRows.map((r: any) => ({
            '№': r.row, 'Əsas təsnifat': r.esas_tasnifat, 'Mağaza kodu': r.magaza_kodu,
            'Mağaza adı': r.magaza_adi, 'Bölgə': r.bolge,
            'Ağırlıq balın cəmi': r.agirlig_bal_cemi, 'Faktiki toplanan bal': r.faktiki_bal,
            'Faiz nisbəti (%)': r.faiz_nisbeti,
        }));
        void this.fileExport.exportRowsToExcel(
            data,
            'Əsas təsnifat',
            datedFileName('esas-tesnifat-uygunlugu', 'xlsx'),
        );
    }

    exportPdf(): void {
        if (!this.allRows) { return; }
        const headers = ['№', 'Əsas təsnifat', 'Mağaza kodu', 'Mağaza adı', 'Bölgə', 'Ağırlıq balı', 'Faktiki bal', 'Faiz (%)'];
        const rows = this.allRows.map((r: any) => [r.row, r.esas_tasnifat, r.magaza_kodu, r.magaza_adi, r.bolge, r.agirlig_bal_cemi, r.faktiki_bal, r.faiz_nisbeti]);
        // PDF-də başlıq neytraldır: rəng məna daşımır
        const pdf = chartColors();
        const docDef: any = {
            pageOrientation: 'landscape',
            content: [{ table: { headerRows: 1, body: [headers.map(h => ({ text: h, style: 'th' })), ...rows] }, layout: 'lightHorizontalLines' }],
            styles: { th: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 8 } },
            defaultStyle: { fontSize: 8 }
        };
        void this.fileExport.exportPdf(docDef, datedFileName('esas-tesnifat-uygunlugu', 'pdf'));
    }
}

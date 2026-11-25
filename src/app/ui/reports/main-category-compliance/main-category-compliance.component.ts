import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, finalize, Subject, Subscription } from 'rxjs';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { ReportsService } from '../reports.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { TableState } from '../../../models/table-state.model';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { weightedPercent } from '../../../shared/utils/compliance';

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
        CommonModule, NgIf, NgFor, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatSelectModule,
        MatTableModule, MatPaginatorModule, MatMenuModule,
        AuditLoadingOverlayComponent
    ],
    templateUrl: './main-category-compliance.component.html',
    styleUrl: './main-category-compliance.component.scss'
})
export class EsasTasnifatUygunluguComponent {
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    columns = [
        { key: 'row', label: '№' },
        { key: 'esas_tasnifat', label: 'Əsas tasnifat' },
        { key: 'magaza_kodu', label: 'Ərazi kodu' },
        { key: 'magaza_adi', label: 'Ərazi adı' },
        { key: 'bolge', label: 'Bölgəsi' },
        { key: 'faktiki_bal', label: 'Faktiki toplanan bal' },
        { key: 'agirlig_bal_cemi', label: 'Tasnifat üzrə ağırlıq balın cəmi' },
        { key: 'faiz_nisbeti', label: 'Faiz nisbəti (%)' },
    ];
    displayedColumns = this.columns.map(c => c.key);
    dataSource = new MatTableDataSource<any>([]);
    allCount = 0;

    filtersForm = new FormGroup({
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });

    firms: Firm[] = [];
    readonly tableState = new TableState();
    private columnFilterSubject = new Subject<{ key: string; value: string }>();
    /** Filter açarları backend sıralama sütun adları ilə uyğun (categoryName, …) */
    private columnApiFilters: Record<string, string> = {};
    private hasSubmittedSearch = false;
    /** Filtrə uyğun bütün sətirlər; axtarışdan əvvəl və yüklənərkən null-dır (ixrac bağlıdır) */
    allRows: any[] | null = null;
    /** Çəkili orta: Σ faktiki bal / Σ ağırlıq balı × 100 */
    avgFaiz: number | null = null;
    private allRowsSub?: Subscription;

    years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    months = [
        { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' },
        { value: 3, label: 'Mart' }, { value: 4, label: 'Aprel' },
        { value: 5, label: 'May' }, { value: 6, label: 'İyun' },
        { value: 7, label: 'İyul' }, { value: 8, label: 'Avqust' },
        { value: 9, label: 'Sentyabr' }, { value: 10, label: 'Oktyabr' },
        { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' }
    ];

    isLoading = false;
    get filterColumns(): string[] { return this.columns.map(c => c.key + '__filter'); }

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnApiFilters).length > 0;
    }

    constructor(
        private inspectionsService: InspectionsService,
        private reportsService: ReportsService,
        private notify: NotificationService,
        private fileExport: FileExportService,
    ) {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = 10;
        this.tableState.sorting.column = 'categoryName';
        this.tableState.sorting.direction = 'asc';
        this.tableState.searchTerm = '';

        this.inspectionsService.getFirms().subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: () => { this.notify.error('Firmalar yüklənmədi'); },
        });

        this.columnFilterSubject.pipe(debounceTime(400)).subscribe(({ key, value }) => {
            this.applyColumnFilterDebounced(key, value);
        });
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
        this.search();
    }

    clearFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.filter-input').forEach(i => { i.value = ''; });
        if (!this.hasSubmittedSearch) { return; }
        this.search();
    }

    onSearch(): void {
        this.hasSubmittedSearch = true;
        this.search();
    }

    /** Filtr dəyişdi: cədvəl ilk səhifədən, orta faiz və ixrac məlumatı bütün sətirlərdən yenilənir */
    private search(): void {
        this.resetToFirstPage();
        this.syncFilterPayload();
        this.fetch();
        this.loadAllRows();
    }

    onPage(e: PageEvent): void {
        if (!this.hasSubmittedSearch) { return; }
        this.tableState.paginator.page = e.pageIndex;
        this.tableState.paginator.size = e.pageSize;
        this.syncFilterPayload();
        this.fetch();
    }

    private resetToFirstPage(): void {
        this.tableState.paginator.page = 0;
        this.paginator?.firstPage();
    }

    private getFormFilters(): Record<string, string> {
        const f: Record<string, string> = {};
        const { year, month, firmId } = this.filtersForm.value;
        if (year != null) { f['year'] = String(year); }
        if (month != null) { f['month'] = String(month); }
        if (firmId != null) { f['firmId'] = String(firmId); }
        return f;
    }

    private syncFilterPayload(): void {
        this.tableState.filter = { ...this.getFormFilters(), ...this.columnApiFilters };
    }

    private fetch(): void {
        this.isLoading = true;
        this.syncFilterPayload();
        this.reportsService.getCategoryScoreDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }))
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
                error: (error) => {
                    this.notify.error(apiErrorMessage(error, 'Məlumat yüklənmədi'));
                    this.dataSource.data = [];
                    this.allCount = 0;
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
            error: (error) => this.notify.error(apiErrorMessage(error, 'Orta faiz və ixrac məlumatı yüklənmədi')),
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
            '№': r.row, 'Əsas tasnifat': r.esas_tasnifat, 'Ərazi kodu': r.magaza_kodu,
            'Ərazi adı': r.magaza_adi, 'Bölgəsi': r.bolge,
            'Ağırlıq balın cəmi': r.agirlig_bal_cemi, 'Faktiki toplanan bal': r.faktiki_bal,
            'Faiz nisbəti (%)': r.faiz_nisbeti,
        }));
        void this.fileExport.exportRowsToExcel(
            data,
            'Əsas Tasnifat',
            datedFileName('esas-tasnifat-uygunlugu', 'xlsx'),
        );
    }

    exportPdf(): void {
        if (!this.allRows) { return; }
        const headers = ['№', 'Əsas tasnifat', 'Ərazi kodu', 'Ərazi adı', 'Bölgəsi', 'Ağırlıq balı', 'Faktiki bal', 'Faiz (%)'];
        const rows = this.allRows.map((r: any) => [r.row, r.esas_tasnifat, r.magaza_kodu, r.magaza_adi, r.bolge, r.agirlig_bal_cemi, r.faktiki_bal, r.faiz_nisbeti]);
        const docDef: any = {
            pageOrientation: 'landscape',
            content: [{ table: { headerRows: 1, body: [headers.map(h => ({ text: h, style: 'th' })), ...rows] }, layout: 'lightHorizontalLines' }],
            styles: { th: { bold: true, color: '#fff', fillColor: '#605DFF', fontSize: 8 } },
            defaultStyle: { fontSize: 8 }
        };
        void this.fileExport.exportPdf(docDef, datedFileName('esas-tasnifat-uygunlugu', 'pdf'));
    }
}

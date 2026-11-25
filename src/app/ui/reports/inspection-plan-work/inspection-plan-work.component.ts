import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { StatusTone } from '../../../shared/status/status-meta';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { chartColors } from '../../../shared/utils/chart-colors';
import { parseApiUtcDate } from '../../../shared/utils/date.util';
import { queryDate, queryNumber, queryString, toQueryDate, writeQueryState } from '../../../shared/utils/query-state';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { PAGE_SIZES } from '../report-filters';
import { ReportsService } from '../reports.service';
import { InspectionPlanWorkResponseData, InspectionPlanWorkRow } from './inspection-plan-work.model';

const COLUMN_TO_API_FILTER: Record<string, string> = {
    magaza_kodu: 'locationCode',
    istifadeci: 'userName',
    status: 'work',
};

// Datanı API yalnız Admin və baş müfəttişə verir (RolePolicies.AdminOrHeadInspector).
@Component({
    selector: 'app-inspection-plan-work',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
        MatTableModule, MatPaginatorModule, MatMenuModule, MatProgressBarModule,
        PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe,
    ],
    providers: [DatePipe],
    templateUrl: './inspection-plan-work.component.html',
    styleUrl: './inspection-plan-work.component.scss',
})
export class InspectionPlanWorkComponent implements OnInit {
    private readonly reportsService = inject(ReportsService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly notify = inject(NotificationService);
    private readonly datePipe = inject(DatePipe);
    private readonly fileExport = inject(FileExportService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    columns = [
        { key: 'row', label: '№' },
        { key: 'magaza_kodu', label: 'Mağaza kodu' },
        { key: 'istifadeci', label: 'İstifadəçi adı' },
        { key: 'is_baslama', label: 'İş başlama tarixi' },
        { key: 'is_bitme', label: 'İş bitmə tarixi' },
        { key: 'status', label: 'Status' },
    ];
    displayedColumns = this.columns.map(c => c.key);
    get filterColumns(): string[] { return this.columns.map(c => c.key + '__filter'); }
    dataSource = new MatTableDataSource<InspectionPlanWorkRow>([]);
    allCount = 0;
    /** Status 2 və 5: təsdiqlənib, yoxlama aparılmayıb. */
    notWorkedCount = 0;
    /** Status 3 və 4: mobil yoxlamanı bitirib. */
    workedCount = 0;

    readonly pageSizes = PAGE_SIZES;
    readonly filtersForm = new FormGroup({
        firmId: new FormControl<number | null>(null),
        userName: new FormControl<string>('', { nonNullable: true }),
        locationCode: new FormControl<string>('', { nonNullable: true }),
        dateRange: new FormGroup({
            start: new FormControl<Date | null>(null),
            end: new FormControl<Date | null>(null),
        }),
    });
    firms: Firm[] = [];

    readonly tableState = new TableState();
    private readonly columnFilterSubject = new Subject<{ key: string; value: string }>();
    private columnApiFilters: Record<string, string> = {};

    searched = false;
    isLoading = false;
    isExporting = false;
    loadError: string | null = null;

    /** API filtri `work`: hesabat yalnız təsdiqlənmiş planları göstərir (2, 3, 4, 5). */
    readonly statusOptions = [
        { value: '', label: 'Hamısı' },
        { value: 'notWorked', label: 'İşlənilməyib' },
        { value: 'worked', label: 'İşlənilib' },
    ];

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnApiFilters).length > 0;
    }

    constructor() {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = PAGE_SIZES[0];
        this.columnFilterSubject.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(({ key, value }) => {
            this.applyColumnFilterDebounced(key, value);
        });
    }

    ngOnInit(): void {
        this.inspectionsService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: error => { this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi')); },
        });

        // Firma məcburidir: URL-də varsa axtarış bərpa olunur
        const q = this.route.snapshot.queryParamMap;
        const firmId = queryNumber(q, 'firm');
        if (firmId == null) return;
        this.filtersForm.patchValue({
            firmId,
            userName: queryString(q, 'user') ?? '',
            locationCode: queryString(q, 'location') ?? '',
            dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
        });
        this.tableState.paginator.page = queryNumber(q, 'page') ?? 0;
        this.tableState.paginator.size = queryNumber(q, 'size') ?? PAGE_SIZES[0];
        this.fetch();
    }

    applyColumnFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim();
        this.columnFilterSubject.next({ key, value });
    }

    applyStatusColumnFilter(value: string): void {
        this.columnFilterSubject.next({ key: 'status', value });
    }

    private applyColumnFilterDebounced(displayKey: string, value: string): void {
        const apiKey = COLUMN_TO_API_FILTER[displayKey];
        if (!apiKey) { return; }
        if (value) {
            this.columnApiFilters[apiKey] = value;
        } else {
            delete this.columnApiFilters[apiKey];
        }
        if (!this.searched || !this.selectedFirmId) { return; }
        this.tableState.paginator.page = 0;
        this.fetch();
    }

    clearColumnFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.column-filter-input').forEach(i => { i.value = ''; });
        if (this.searched && this.selectedFirmId) {
            this.tableState.paginator.page = 0;
            this.fetch();
        }
    }

    /** "Təmizlə": filtrlər sıfırlanır, nəticə və URL təmizlənir */
    clearAll(): void {
        this.filtersForm.reset();
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.column-filter-input').forEach(i => { i.value = ''; });
        this.searched = false;
        this.loadError = null;
        this.resetSummary();
        void writeQueryState(this.router, { firm: null, user: null, location: null, from: null, to: null, page: null, size: null });
    }

    onSearch(): void {
        if (!this.selectedFirmId) {
            this.filtersForm.controls.firmId.markAsTouched();
            this.notify.warning('Firma seçin');
            return;
        }
        const v = this.filtersForm.getRawValue();
        this.tableState.paginator.page = 0;
        void writeQueryState(this.router, {
            firm: v.firmId,
            user: v.userName.trim(),
            location: v.locationCode.trim(),
            from: v.dateRange.start,
            to: v.dateRange.end,
            page: null,
        });
        this.fetch();
    }

    onPage(e: PageEvent): void {
        this.tableState.paginator.page = e.pageIndex;
        this.tableState.paginator.size = e.pageSize;
        void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
        this.fetch();
    }

    private get selectedFirmId(): number | null {
        return this.filtersForm.controls.firmId.value;
    }

    private getFormFilters(): Record<string, string> {
        const f: Record<string, string> = {};
        const { firmId, userName, locationCode, dateRange } = this.filtersForm.getRawValue();
        if (firmId != null) { f['firmId'] = String(firmId); }
        if (userName.trim()) { f['userName'] = userName.trim(); }
        if (locationCode.trim()) { f['locationCode'] = locationCode.trim(); }
        if (dateRange.start) { f['startDate'] = toQueryDate(dateRange.start); }
        if (dateRange.end) { f['endDate'] = toQueryDate(dateRange.end); }
        return f;
    }

    private syncFilterPayload(): void {
        this.tableState.filter = { ...this.getFormFilters(), ...this.columnApiFilters };
        this.tableState.searchTerm = '';
    }

    fetch(): void {
        if (!this.selectedFirmId) { return; }
        this.searched = true;
        this.isLoading = true;
        this.loadError = null;
        this.syncFilterPayload();
        this.reportsService.getInspectionPlanWorkDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    const data = this.normalizeResponseData(res);
                    this.allCount = data.total;
                    this.notWorkedCount = data.notWorkedCount;
                    this.workedCount = data.workedCount;
                    const page = this.tableState.paginator.page;
                    const size = this.tableState.paginator.size;
                    this.dataSource.data = data.items.map((item, idx) => this.mapApiRow(item, page * size + idx + 1));
                },
                error: error => {
                    this.loadError = apiErrorMessage(error, 'Hesabat yüklənmədi. İnternet bağlantısını və ya icazəni yoxlayın.');
                },
            });
    }

    private resetSummary(): void {
        this.dataSource.data = [];
        this.allCount = 0;
        this.notWorkedCount = 0;
        this.workedCount = 0;
    }

    private normalizeResponseData(res: unknown): InspectionPlanWorkResponseData {
        const raw = (res as { data?: Record<string, unknown> })?.data ?? {};
        const items = (raw['items'] ?? raw['Items'] ?? []) as Record<string, unknown>[];
        const total = this.toCount(raw['total'] ?? raw['Total'], items.length);
        const notWorkedCount = this.toCount(raw['notWorkedCount']);
        const workedCount = this.toCount(raw['workedCount']);
        return { items, total, notWorkedCount, workedCount };
    }

    private toCount(value: unknown, fallback = 0): number {
        if (value == null || value === '') {
            return fallback;
        }
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    private mapApiRow(item: Record<string, unknown>, rowNo: number): InspectionPlanWorkRow {
        const status = Number(item['status'] ?? item['Status'] ?? 0);
        const work = this.resolveWork(status);
        return {
            row: rowNo,
            magaza_kodu: (item['locationCode'] ?? item['LocationCode'] ?? '') as number | string,
            istifadeci: String(item['userName'] ?? item['UserName'] ?? ''),
            is_baslama: parseApiUtcDate(item['workStartDate'] as string | null) ?? null,
            is_bitme: parseApiUtcDate(item['workEndDate'] as string | null) ?? null,
            status,
            statusLabel: work.label,
            statusTone: work.tone,
        };
    }

    /**
     * Hesabatın öz anlayışı: plan işi görülübmü. Plan statusunun etiketi deyil —
     * 3 və 4 birlikdə "İşlənilib", 2 və 5 "İşlənilməyib" sayılır (KPI və sütun filtri də belədir).
     * 5-də vaxt keçib: plan artıq işlənməyəcək, ona görə ayrıca etiket alır.
     */
    private resolveWork(status: number): { label: string; tone: StatusTone } {
        if (status === 2) return { label: 'İşlənilməyib', tone: 'warning' };
        if (status === 5) return { label: 'Vaxtı bitib', tone: 'danger' };
        if (status === 3 || status === 4) return { label: 'İşlənilib', tone: 'success' };
        return { label: `Status ${status}`, tone: 'neutral' };
    }

    exportExcel(): void {
        this.exportWithAllRows(rows => this.writeExcel(rows));
    }

    exportPdf(): void {
        this.exportWithAllRows(rows => this.writePdf(rows));
    }

    private exportWithAllRows(onReady: (rows: InspectionPlanWorkRow[]) => void): void {
        if (!this.searched || this.allCount === 0) {
            this.notify.error('İxrac üçün məlumat yoxdur', { message: 'Əvvəlcə firma seçib «Axtar» düyməsini basın.' });
            return;
        }

        this.isExporting = true;
        this.reportsService.getInspectionPlanWorkDetails(this.buildExportTableState())
            .pipe(finalize(() => { this.isExporting = false; }))
            .subscribe({
                next: res => {
                    const data = this.normalizeResponseData(res);
                    const rows = data.items.map((item, idx) => this.mapApiRow(item, idx + 1));
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

    private buildExportTableState(): TableState {
        const state = new TableState();
        this.syncFilterPayload();
        state.filter = { ...this.tableState.filter };
        state.searchTerm = '';
        state.paginator.page = 0;
        state.paginator.size = Math.max(this.allCount, 1);
        return state;
    }

    private writeExcel(rows: InspectionPlanWorkRow[]): void {
        const data = rows.map(r => ({
            '№': r.row,
            'Mağaza kodu': r.magaza_kodu,
            'İstifadəçi adı': r.istifadeci,
            'İş başlama tarixi': r.is_baslama
                ? this.datePipe.transform(r.is_baslama, 'yyyy-MM-dd HH:mm', '+0400') ?? '—'
                : '—',
            'İş bitmə tarixi': r.is_bitme
                ? this.datePipe.transform(r.is_bitme, 'yyyy-MM-dd HH:mm', '+0400') ?? '—'
                : '—',
            'Status': r.statusLabel,
        }));
        void this.fileExport.exportRowsToExcel(
            data,
            'Plan iş statusu',
            datedFileName('yoxlama-plani-is-statusu', 'xlsx'),
        );
    }

    private writePdf(rows: InspectionPlanWorkRow[]): void {
        const headers = ['№', 'Mağaza kodu', 'İstifadəçi', 'Başlama', 'Bitmə', 'Status'];
        const bodyRows = rows.map(r => [
            r.row,
            r.magaza_kodu,
            r.istifadeci,
            r.is_baslama ? this.datePipe.transform(r.is_baslama, 'yyyy-MM-dd HH:mm', '+0400') ?? '—' : '—',
            r.is_bitme ? this.datePipe.transform(r.is_bitme, 'yyyy-MM-dd HH:mm', '+0400') ?? '—' : '—',
            r.statusLabel,
        ]);
        // PDF-də başlıq neytraldır: rəng məna daşımır
        const pdf = chartColors();
        const docDef = {
            pageOrientation: 'landscape' as const,
            content: [{
                table: {
                    headerRows: 1,
                    body: [headers.map(h => ({ text: h, style: 'th' })), ...bodyRows],
                },
                layout: 'lightHorizontalLines',
            }],
            styles: { th: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 9 } },
            defaultStyle: { fontSize: 9 },
        };
        void this.fileExport.exportPdf(docDef, datedFileName('yoxlama-plani-is-statusu', 'pdf'));
    }
}

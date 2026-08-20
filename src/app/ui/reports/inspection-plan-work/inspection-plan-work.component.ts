import { CommonModule, DatePipe } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { debounceTime, finalize, Subject } from 'rxjs';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TableState } from '../../../models/table-state.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { parseApiUtcDate } from '../../../shared/utils/date.util';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { ReportsService } from '../reports.service';
import { InspectionPlanWorkRow, InspectionPlanWorkResponseData } from './inspection-plan-work.model';

const COLUMN_TO_API_FILTER: Record<string, string> = {
    magaza_kodu: 'locationCode',
    istifadeci: 'userName',
    status: 'status',
};

@Component({
    selector: 'app-inspection-plan-work',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, DatePipe,
        MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatTableModule, MatPaginatorModule, MatMenuModule,
        MatDatepickerModule, MatNativeDateModule,
        AuditLoadingOverlayComponent,
    ],
    providers: [DatePipe],
    templateUrl: './inspection-plan-work.component.html',
    styleUrl: './inspection-plan-work.component.scss',
})
export class InspectionPlanWorkComponent {
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    columns = [
        { key: 'row', label: '№' },
        { key: 'magaza_kodu', label: 'Mağaza kodu' },
        { key: 'istifadeci', label: 'İstifadəçi adı' },
        { key: 'is_baslama', label: 'İş başlama tarixi' },
        { key: 'is_bitme', label: 'İş bitmə tarixi' },
        { key: 'status', label: 'Status' },
    ];
    displayedColumns = this.columns.map(c => c.key);
    dataSource = new MatTableDataSource<InspectionPlanWorkRow>([]);
    allCount = 0;
    status2Count = 0;
    status34Count = 0;

    filtersForm = new FormGroup({
        firmId: new FormControl<number | null>(null),
        userName: new FormControl<string>(''),
        locationCode: new FormControl<string>(''),
        dateRange: new FormGroup({
            start: new FormControl<Date | null>(null),
            end: new FormControl<Date | null>(null),
        }),
    });

    firms: Firm[] = [];

    readonly tableState = new TableState();
    private columnFilterSubject = new Subject<{ key: string; value: string }>();
    private columnApiFilters: Record<string, string> = {};
    hasSubmittedSearch = false;

    isLoading = false;
    isExporting = false;

    readonly statusOptions = [
        { value: '', label: 'Hamısı' },
        { value: '2', label: 'İşlənilməyib' },
        { value: '3', label: 'İşlənilib' },
        { value: '4', label: 'İşlənilib (4)' },
    ];

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
        private datePipe: DatePipe,
    ) {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = 10;

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
        if (!this.hasSubmittedSearch || !this.getSelectedFirmId()) { return; }
        this.resetToFirstPage();
        this.syncFilterPayload();
        this.fetch();
    }

    clearColumnFilters(): void {
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.column-filter-input').forEach(i => { i.value = ''; });
        if (this.hasSubmittedSearch && this.getSelectedFirmId()) {
            this.resetToFirstPage();
            this.syncFilterPayload();
            this.fetch();
        }
    }

    clearAllFilters(): void {
        this.filtersForm.reset({
            firmId: null,
            userName: '',
            locationCode: '',
            dateRange: { start: null, end: null },
        });
        this.columnApiFilters = {};
        document.querySelectorAll<HTMLInputElement>('.column-filter-input').forEach(i => { i.value = ''; });
        this.hasSubmittedSearch = false;
        this.resetSummary();
    }

    onSearch(): void {
        if (!this.getSelectedFirmId()) {
            this.notify.error('Firma seçilməyib', { message: 'Hesabat üçün əvvəlcə firma seçin.' });
            return;
        }
        this.hasSubmittedSearch = true;
        this.resetToFirstPage();
        this.syncFilterPayload();
        this.fetch();
    }

    onPage(e: PageEvent): void {
        if (!this.hasSubmittedSearch || !this.getSelectedFirmId()) { return; }
        this.tableState.paginator.page = e.pageIndex;
        this.tableState.paginator.size = e.pageSize;
        this.syncFilterPayload();
        this.fetch();
    }

    private resetToFirstPage(): void {
        this.tableState.paginator.page = 0;
        this.paginator?.firstPage();
    }

    private getSelectedFirmId(): number | null {
        const firmId = this.filtersForm.getRawValue().firmId;
        return firmId != null ? firmId : null;
    }

    private getFormFilters(): Record<string, string> {
        const f: Record<string, string> = {};
        const { firmId, userName, locationCode, dateRange } = this.filtersForm.getRawValue();

        if (firmId != null) {
            f['firmId'] = String(firmId);
        }

        if (userName?.trim()) {
            f['userName'] = userName.trim();
        }
        if (locationCode?.trim()) {
            f['locationCode'] = locationCode.trim();
        }

        const startDate = this.datePipe.transform(dateRange?.start, 'yyyy-MM-dd');
        const endDate = this.datePipe.transform(dateRange?.end, 'yyyy-MM-dd');
        if (startDate) {
            f['startDate'] = startDate;
        }
        if (endDate) {
            f['endDate'] = endDate;
        }

        return f;
    }

    private syncFilterPayload(): void {
        this.tableState.filter = { ...this.getFormFilters(), ...this.columnApiFilters };
        this.tableState.searchTerm = '';
    }

    private fetch(): void {
        if (!this.getSelectedFirmId()) {
            return;
        }
        this.isLoading = true;
        this.syncFilterPayload();
        this.reportsService.getInspectionPlanWorkDetails(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }))
            .subscribe({
                next: res => {
                    const data = this.normalizeResponseData(res);
                    this.allCount = data.total;
                    this.status2Count = data.status2Count;
                    this.status34Count = data.status34Count;
                    const page = this.tableState.paginator.page;
                    const size = this.tableState.paginator.size;
                    this.dataSource.data = data.items.map((item, idx) =>
                        this.mapApiRow(item, page * size + idx + 1));
                },
                error: () => {
                    this.notify.error('Hesabat yüklənmədi', { message: 'Şəbəkə və ya icazəni yoxlayın.' });
                    this.resetSummary();
                },
            });
    }

    private resetSummary(): void {
        this.dataSource.data = [];
        this.allCount = 0;
        this.status2Count = 0;
        this.status34Count = 0;
    }

    private normalizeResponseData(res: unknown): InspectionPlanWorkResponseData {
        const raw = (res as { data?: Record<string, unknown> })?.data ?? {};
        const items = (raw['items'] ?? raw['Items'] ?? []) as Record<string, unknown>[];
        const total = this.toCount(raw['total'] ?? raw['Total'], items.length);
        const status2Count = this.toCount(raw['status2Count'] ?? raw['Status2Count']);
        const status34Count = this.toCount(raw['status34Count'] ?? raw['Status34Count']);

        return { items, total, status2Count, status34Count };
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
        const statusMeta = this.resolveStatus(status);

        return {
            row: rowNo,
            magaza_kodu: (item['locationCode'] ?? item['LocationCode'] ?? '') as number | string,
            istifadeci: String(item['userName'] ?? item['UserName'] ?? ''),
            is_baslama: parseApiUtcDate(item['workStartDate'] as string | null) ?? null,
            is_bitme: parseApiUtcDate(item['workEndDate'] as string | null) ?? null,
            status,
            statusLabel: statusMeta.label,
            statusClass: statusMeta.class,
        };
    }

    private resolveStatus(status: number): { label: string; class: InspectionPlanWorkRow['statusClass'] } {
        if (status === 2) {
            return { label: 'İşlənilməyib', class: 'not-processed' };
        }
        if (status === 3 || status === 4) {
            return { label: 'İşlənilib', class: 'processed' };
        }
        return { label: `Naməlum (${status})`, class: 'unknown' };
    }

    exportExcel(): void {
        this.exportWithAllRows(rows => this.writeExcel(rows));
    }

    exportPdf(): void {
        this.exportWithAllRows(rows => this.writePdf(rows));
    }

    private exportWithAllRows(onReady: (rows: InspectionPlanWorkRow[]) => void): void {
        if (!this.getSelectedFirmId()) {
            this.notify.error('Firma seçilməyib', { message: 'Export üçün əvvəlcə firma seçin.' });
            return;
        }
        if (!this.hasSubmittedSearch) {
            this.notify.error('Axtarış edilməyib', { message: 'Export üçün əvvəlcə "Axtar" düyməsini basın.' });
            return;
        }
        if (this.allCount === 0) {
            this.notify.error('Export üçün məlumat yoxdur');
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
                        this.notify.error('Export üçün məlumat tapılmadı');
                        return;
                    }
                    onReady(rows);
                },
                error: () => {
                    this.notify.error('Export üçün məlumat yüklənmədi', { message: 'Şəbəkə və ya icazəni yoxlayın.' });
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
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plan iş statusu');
        XLSX.writeFile(wb, `yoxlama-plani-is-statusu-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    private writePdf(rows: InspectionPlanWorkRow[]): void {
        const vfs: Record<string, string> = (pdfFonts as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }).pdfMake
            ? (pdfFonts as { pdfMake: { vfs: Record<string, string> } }).pdfMake.vfs
            : (pdfFonts as { vfs: Record<string, string> }).vfs;
        (pdfMake as { vfs: Record<string, string> }).vfs = vfs;
        const headers = ['№', 'Mağaza kodu', 'İstifadəçi', 'Başlama', 'Bitmə', 'Status'];
        const bodyRows = rows.map(r => [
            r.row,
            r.magaza_kodu,
            r.istifadeci,
            r.is_baslama ? this.datePipe.transform(r.is_baslama, 'yyyy-MM-dd HH:mm', '+0400') ?? '—' : '—',
            r.is_bitme ? this.datePipe.transform(r.is_bitme, 'yyyy-MM-dd HH:mm', '+0400') ?? '—' : '—',
            r.statusLabel,
        ]);
        const docDef = {
            pageOrientation: 'landscape' as const,
            content: [{
                table: {
                    headerRows: 1,
                    body: [headers.map(h => ({ text: h, style: 'th' })), ...bodyRows],
                },
                layout: 'lightHorizontalLines',
            }],
            styles: { th: { bold: true, color: '#fff', fillColor: '#5B6CFF', fontSize: 9 } },
            defaultStyle: { fontSize: 9 },
        };
        pdfMake.createPdf(docDef).download(`yoxlama-plani-is-statusu-${new Date().toISOString().slice(0, 10)}.pdf`);
    }
}

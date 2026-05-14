import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, finalize, takeUntil } from 'rxjs/operators';
import { TableState } from '../../../models/table-state.model';
import { ReportsService } from '../reports.service';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';

@Component({
    selector: 'app-yoxlama-statistikasi',
    standalone: true,
    imports: [
        CommonModule, NgIf, NgFor, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatSelectModule,
        MatTableModule, MatPaginatorModule,
        MatTabsModule, MatMenuModule,
        AuditLoadingOverlayComponent
    ],
    templateUrl: './inspection-statistics.component.html',
    styleUrl: './inspection-statistics.component.scss'
})
export class YoxlamaStatistikasiComponent implements AfterViewInit, OnDestroy {
    @ViewChild('storePaginator') storePaginator!: MatPaginator;
    @ViewChild('employeePaginator') employeePaginator!: MatPaginator;

    storeColumns = [
        { key: 'row', label: '№' },
        { key: 'magaza_kodu', label: 'Ərazi kodu' },
        { key: 'magaza_adi', label: 'Ərazi adı' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'planli_say', label: 'Planlı yoxlama sayı' },
        { key: 'plandankanar_say', label: 'Plandankənar yoxlama sayı' },
    ];
    storeDisplayedColumns = this.storeColumns.map(c => c.key);
    storeDataSource = new MatTableDataSource<any>([]);
    storeTotal = 0;

    employeeColumns = [
        { key: 'row', label: '№' },
        { key: 'user_kodu', label: 'İstifadəçi kodu' },
        { key: 'emekdas_adi', label: 'Əməkdaş adı və soyadı' },
        { key: 'planli_say', label: 'Planlı yoxlama sayı' },
        { key: 'plandankanar_say', label: 'Plandankənar yoxlama sayı' },
    ];
    employeeDisplayedColumns = this.employeeColumns.map(c => c.key);
    employeeDataSource = new MatTableDataSource<any>([]);
    employeeTotal = 0;

    filtersForm = new FormGroup({
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });

    years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    months = [
        { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' },
        { value: 3, label: 'Mart' }, { value: 4, label: 'Aprel' },
        { value: 5, label: 'May' }, { value: 6, label: 'İyun' },
        { value: 7, label: 'İyul' }, { value: 8, label: 'Avqust' },
        { value: 9, label: 'Sentyabr' }, { value: 10, label: 'Oktyabr' },
        { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' }
    ];
    firms: Firm[] = [];

    loadingStore = false;
    loadingEmployee = false;
    activeTab = 0;
    searched = false;

    private readonly destroy$ = new Subject<void>();
    private readonly storeColumnFilterTick$ = new Subject<void>();
    private readonly employeeColumnFilterTick$ = new Subject<void>();

    private storeTableState = new TableState();
    private employeeTableState = new TableState();
    private storePaginatorSub?: Subscription;
    private employeePaginatorSub?: Subscription;

    storeColumnFilters: Record<string, string> = {};
    employeeColumnFilters: Record<string, string> = {};
    get storeFilterColumns(): string[] { return this.storeColumns.map(c => c.key + '__filter'); }
    get employeeFilterColumns(): string[] { return this.employeeColumns.map(c => c.key + '__filter'); }

    get hasStoreTableColumnFilters(): boolean {
        return Object.keys(this.storeColumnFilters).length > 0;
    }

    get hasEmployeeTableColumnFilters(): boolean {
        return Object.keys(this.employeeColumnFilters).length > 0;
    }

    private readonly storeColToApi: Record<string, string> = {
        magaza_kodu: 'locationCode',
        magaza_adi: 'locationName',
        bolge: 'regionName',
    };
    private readonly employeeColToApi: Record<string, string> = {
        user_kodu: 'userCode',
        emekdas_adi: 'userName',
    };

    constructor(
        private reportsService: ReportsService,
        private inspectionsService: InspectionsService,
        private notify: NotificationService,
    ) {
        this.inspectionsService.getFirms().subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: () => { this.notify.error('Firmalar yüklənmədi'); },
        });
    }

    ngAfterViewInit(): void {
        this.storeDataSource.paginator = null as any;
        this.employeeDataSource.paginator = null as any;

        queueMicrotask(() => this.tryWirePaginators());

        this.storeColumnFilterTick$.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
            if (!this.searched) { return; }
            this.storeTableState.paginator.page = 0;
            if (this.storePaginator) { this.storePaginator.pageIndex = 0; }
            this.fetchStoreOnly();
        });

        this.employeeColumnFilterTick$.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
            if (!this.searched) { return; }
            this.employeeTableState.paginator.page = 0;
            if (this.employeePaginator) { this.employeePaginator.pageIndex = 0; }
            this.fetchEmployeeOnly();
        });
    }

    onTabIndexChange(index: number): void {
        this.activeTab = index;
        queueMicrotask(() => this.tryWirePaginators());
    }

    private tryWirePaginators(): void {
        if (this.storePaginator && !this.storePaginatorSub) {
            this.storeTableState.paginator.size = this.storePaginator.pageSize;
            this.storePaginatorSub = this.storePaginator.page.pipe(takeUntil(this.destroy$)).subscribe(() => {
                if (!this.searched) { return; }
                this.storeTableState.paginator.page = this.storePaginator.pageIndex;
                this.storeTableState.paginator.size = this.storePaginator.pageSize;
                this.fetchStoreOnly();
            });
        }
        if (this.employeePaginator && !this.employeePaginatorSub) {
            this.employeeTableState.paginator.size = this.employeePaginator.pageSize;
            this.employeePaginatorSub = this.employeePaginator.page.pipe(takeUntil(this.destroy$)).subscribe(() => {
                if (!this.searched) { return; }
                this.employeeTableState.paginator.page = this.employeePaginator.pageIndex;
                this.employeeTableState.paginator.size = this.employeePaginator.pageSize;
                this.fetchEmployeeOnly();
            });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    applyStoreFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim();
        if (value) { this.storeColumnFilters[key] = value; } else { delete this.storeColumnFilters[key]; }
        this.storeColumnFilterTick$.next();
    }

    applyEmployeeFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim();
        if (value) { this.employeeColumnFilters[key] = value; } else { delete this.employeeColumnFilters[key]; }
        this.employeeColumnFilterTick$.next();
    }

    clearStoreFilters(): void {
        this.storeColumnFilters = {};
        document.querySelectorAll<HTMLInputElement>('.store-filter-input').forEach(i => { i.value = ''; });
        if (this.searched) {
            this.storeTableState.paginator.page = 0;
            if (this.storePaginator) { this.storePaginator.pageIndex = 0; }
            this.fetchStoreOnly();
        }
    }

    clearEmployeeFilters(): void {
        this.employeeColumnFilters = {};
        document.querySelectorAll<HTMLInputElement>('.emp-filter-input').forEach(i => { i.value = ''; });
        if (this.searched) {
            this.employeeTableState.paginator.page = 0;
            if (this.employeePaginator) { this.employeePaginator.pageIndex = 0; }
            this.fetchEmployeeOnly();
        }
    }

    onSearch(): void {
        this.searched = true;
        this.storeTableState.paginator.page = 0;
        this.employeeTableState.paginator.page = 0;
        if (this.storePaginator) {
            this.storePaginator.pageIndex = 0;
            this.storeTableState.paginator.size = this.storePaginator.pageSize;
        }
        if (this.employeePaginator) {
            this.employeePaginator.pageIndex = 0;
            this.employeeTableState.paginator.size = this.employeePaginator.pageSize;
        }

        this.syncTableStatesFromForm();
        this.loadingStore = true;
        this.loadingEmployee = true;

        forkJoin({
            store: this.reportsService.getInspectionDetailsByStoreRegion(this.storeTableState),
            employee: this.reportsService.getInspectionDetailsByInspector(this.employeeTableState),
        }).pipe(
            finalize(() => {
                this.loadingStore = false;
                this.loadingEmployee = false;
            })
        ).subscribe({
            next: ({ store, employee }) => {
                this.applyStoreResponse(store);
                this.applyEmployeeResponse(employee);
            },
            error: () => {
                this.notify.error('Hesabat sorğusu uğursuz oldu', { message: 'Şəbəkə və ya icazəni yoxlayın.' });
                this.storeDataSource.data = [];
                this.employeeDataSource.data = [];
                this.storeTotal = 0;
                this.employeeTotal = 0;
            },
        });
    }

    private fetchStoreOnly(): void {
        this.syncTableStatesFromForm();
        this.loadingStore = true;
        this.reportsService.getInspectionDetailsByStoreRegion(this.storeTableState).pipe(
            finalize(() => { this.loadingStore = false; })
        ).subscribe({
            next: res => this.applyStoreResponse(res),
            error: () => {
                this.notify.error('Ərazi hesabatı yüklənmədi');
                this.storeDataSource.data = [];
                this.storeTotal = 0;
            },
        });
    }

    private fetchEmployeeOnly(): void {
        this.syncTableStatesFromForm();
        this.loadingEmployee = true;
        this.reportsService.getInspectionDetailsByInspector(this.employeeTableState).pipe(
            finalize(() => { this.loadingEmployee = false; })
        ).subscribe({
            next: res => this.applyEmployeeResponse(res),
            error: () => {
                this.notify.error('Auditor hesabatı yüklənmədi');
                this.employeeDataSource.data = [];
                this.employeeTotal = 0;
            },
        });
    }

    private syncTableStatesFromForm(): void {
        const v = this.filtersForm.getRawValue();
        const storeFilter = this.buildStoreFilterRecord(v);
        const employeeFilter = this.buildEmployeeFilterRecord(v);

        this.storeTableState.filter = storeFilter;
        this.storeTableState.searchTerm = '';
        this.employeeTableState.filter = employeeFilter;
        this.employeeTableState.searchTerm = '';
    }

    private buildStoreFilterRecord(v: {
        year: number | null; month: number | null; firmId: number | null;
    }): Record<string, string> {
        const f: Record<string, string> = {};
        if (v.year != null) { f['year'] = String(v.year); }
        if (v.month != null) { f['month'] = String(v.month); }
        if (v.firmId != null) { f['firmId'] = String(v.firmId); }
        for (const [col, val] of Object.entries(this.storeColumnFilters)) {
            const apiKey = this.storeColToApi[col];
            if (apiKey && val) { f[apiKey] = val; }
        }
        return f;
    }

    private buildEmployeeFilterRecord(v: {
        year: number | null; month: number | null; firmId: number | null;
    }): Record<string, string> {
        const f: Record<string, string> = {};
        if (v.year != null) { f['year'] = String(v.year); }
        if (v.month != null) { f['month'] = String(v.month); }
        if (v.firmId != null) { f['firmId'] = String(v.firmId); }
        for (const [col, val] of Object.entries(this.employeeColumnFilters)) {
            const apiKey = this.employeeColToApi[col];
            if (apiKey && val) { f[apiKey] = val; }
        }
        return f;
    }

    private applyStoreResponse(res: { data?: { items?: unknown[]; total?: number } }): void {
        const items = res?.data?.items ?? [];
        this.storeTotal = res?.data?.total ?? items.length;
        const page = this.storeTableState.paginator.page;
        const size = this.storeTableState.paginator.size;
        this.storeDataSource.data = items.map((raw, i) => this.normalizeStoreRow(raw, page * size + i + 1));
        if (this.storePaginator) { this.storePaginator.length = this.storeTotal; }
    }

    private applyEmployeeResponse(res: { data?: { items?: unknown[]; total?: number } }): void {
        const items = res?.data?.items ?? [];
        this.employeeTotal = res?.data?.total ?? items.length;
        const page = this.employeeTableState.paginator.page;
        const size = this.employeeTableState.paginator.size;
        this.employeeDataSource.data = items.map((raw, i) => this.normalizeEmployeeRow(raw, page * size + i + 1));
        if (this.employeePaginator) { this.employeePaginator.length = this.employeeTotal; }
    }

    private normalizeStoreRow(item: any, rowNo: number): any {
        const planli = item.planned ?? item.Planned
            ?? item.planli_say ?? item.planliSay ?? item.plannedCount ?? item.planlıYoxlamaSayı ?? item.planliCount ?? 0;
        const plansiz = item.unPlanned ?? item.UnPlanned ?? item.unplanned ?? item.Unplanned
            ?? item.plandankanar_say ?? item.plansizSay ?? item.unplannedCount ?? item.plandankenarSay ?? item.extraCount ?? 0;
        return {
            row: rowNo,
            magaza_kodu: item.magaza_kodu ?? item.locationCode ?? item.LocationCode ?? item.branchCode ?? '',
            magaza_adi: item.magaza_adi ?? item.locationName ?? item.LocationName ?? item.branchName ?? '',
            bolge: item.bolge ?? item.regionName ?? item.RegionName ?? item.region ?? '',
            planli_say: Number(planli) || 0,
            plandankanar_say: Number(plansiz) || 0,
        };
    }

    private normalizeEmployeeRow(item: any, rowNo: number): any {
        const planli = item.planned ?? item.Planned
            ?? item.planli_say ?? item.planliSay ?? item.plannedCount ?? item.planlıYoxlamaSayı ?? item.planliCount ?? 0;
        const plansiz = item.unPlanned ?? item.UnPlanned ?? item.unplanned ?? item.Unplanned
            ?? item.plandankanar_say ?? item.plansizSay ?? item.unplannedCount ?? item.plandankenarSay ?? item.extraCount ?? 0;
        return {
            row: rowNo,
            user_kodu: item.user_kodu ?? item.userCode ?? item.UserCode ?? '',
            emekdas_adi: item.emekdas_adi ?? item.userName ?? item.UserName ?? item.fullName ?? item.inspectorName ?? '',
            planli_say: Number(planli) || 0,
            plandankanar_say: Number(plansiz) || 0,
        };
    }

    get storeCount(): number { return this.storeTotal; }
    get employeeCount(): number { return this.employeeTotal; }

    getStoreTotal(field: 'planli_say' | 'plandankanar_say'): number {
        return this.storeDataSource.data.reduce((sum, r) => sum + (r[field] ?? 0), 0);
    }

    getEmployeeTotal(field: 'planli_say' | 'plandankanar_say'): number {
        return this.employeeDataSource.data.reduce((sum, r) => sum + (r[field] ?? 0), 0);
    }

    exportExcel(tab: 'store' | 'employee'): void {
        const data = tab === 'store'
            ? this.storeDataSource.data.map((r: any) => ({
                '№': r.row, 'Ərazi kodu': r.magaza_kodu, 'Ərazi adı': r.magaza_adi,
                'Bölgə': r.bolge, 'Planlı yoxlama sayı': r.planli_say, 'Plandankənar yoxlama sayı': r.plandankanar_say,
            }))
            : this.employeeDataSource.data.map((r: any) => ({
                '№': r.row, 'İstifadəçi kodu': r.user_kodu, 'Əməkdaş adı': r.emekdas_adi,
                'Planlı yoxlama sayı': r.planli_say, 'Plandankənar yoxlama sayı': r.plandankanar_say,
            }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, tab === 'store' ? 'Ərazi bazında' : 'Əməkdaş bazında');
        XLSX.writeFile(wb, `yoxlama-statistikasi-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    exportPdf(tab: 'store' | 'employee'): void {
        const vfs: any = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;
        (pdfMake as any).vfs = vfs;
        const isStore = tab === 'store';
        const headers = isStore
            ? ['№', 'Ərazi kodu', 'Ərazi adı', 'Bölgə', 'Planlı yoxlama sayı', 'Plandankənar yoxlama sayı']
            : ['№', 'İstifadəçi kodu', 'Əməkdaş adı və soyadı', 'Planlı yoxlama sayı', 'Plandankənar yoxlama sayı'];
        const rows = isStore
            ? this.storeDataSource.data.map((r: any) => [r.row, r.magaza_kodu, r.magaza_adi, r.bolge, r.planli_say, r.plandankanar_say])
            : this.employeeDataSource.data.map((r: any) => [r.row, r.user_kodu, r.emekdas_adi, r.planli_say, r.plandankanar_say]);
        const docDef: any = {
            content: [{ table: { headerRows: 1, body: [headers.map(h => ({ text: h, style: 'th' })), ...rows] }, layout: 'lightHorizontalLines' }],
            styles: { th: { bold: true, color: '#fff', fillColor: '#605DFF', fontSize: 9 } },
            defaultStyle: { fontSize: 9 }
        };
        pdfMake.createPdf(docDef).download(`yoxlama-statistikasi-${tab}-${new Date().toISOString().slice(0, 10)}.pdf`);
    }
}

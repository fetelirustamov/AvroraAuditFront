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
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom, forkJoin } from 'rxjs';
import { debounceTime, finalize } from 'rxjs/operators';
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

/** Cari səhifənin sətirləri + bütün filtrlənmiş sətirlər üzrə cəmlər (API: InspectionReportResponse) */
interface ReportPageWithTotals {
    items?: unknown[];
    total?: number;
    plannedTotal?: number;
    unPlannedTotal?: number;
}

type Tab = 'store' | 'employee';

/** Hər tab üçün URL açarları: mağaza `page/size`, əməkdaş `epage/esize` */
const PAGE_KEYS: Record<Tab, { page: string; size: string }> = {
    store: { page: 'page', size: 'size' },
    employee: { page: 'epage', size: 'esize' },
};

@Component({
    selector: 'app-yoxlama-statistikasi',
    standalone: true,
    imports: [
        NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, ReactiveFormsModule,
        MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatTabsModule, MatMenuModule,
        MatProgressBarModule, PageHeaderComponent, ListStateComponent,
    ],
    templateUrl: './inspection-statistics.component.html',
    styleUrl: './inspection-statistics.component.scss'
})
export class YoxlamaStatistikasiComponent implements OnInit {
    private readonly reportsService = inject(ReportsService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly notify = inject(NotificationService);
    private readonly fileExport = inject(FileExportService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    storeColumns = [
        { key: 'row', label: '№' },
        { key: 'magaza_kodu', label: 'Mağaza kodu' },
        { key: 'magaza_adi', label: 'Mağaza adı' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'planli_say', label: 'Planlı yoxlama sayı' },
        { key: 'plandankanar_say', label: 'Plandankənar yoxlama sayı' },
    ];
    storeDisplayedColumns = this.storeColumns.map(c => c.key);
    storeFilterColumns = this.storeColumns.map(c => c.key + '__filter');
    storeDataSource = new MatTableDataSource<any>([]);
    storeTotal = 0;
    private storeSums = { planli_say: 0, plandankanar_say: 0 };

    employeeColumns = [
        { key: 'row', label: '№' },
        { key: 'user_kodu', label: 'İstifadəçi kodu' },
        { key: 'emekdas_adi', label: 'Əməkdaş adı və soyadı' },
        { key: 'planli_say', label: 'Planlı yoxlama sayı' },
        { key: 'plandankanar_say', label: 'Plandankənar yoxlama sayı' },
    ];
    employeeDisplayedColumns = this.employeeColumns.map(c => c.key);
    employeeFilterColumns = this.employeeColumns.map(c => c.key + '__filter');
    employeeDataSource = new MatTableDataSource<any>([]);
    employeeTotal = 0;
    private employeeSums = { planli_say: 0, plandankanar_say: 0 };

    readonly years = REPORT_YEARS;
    readonly months = MONTH_OPTIONS;
    readonly pageSizes = PAGE_SIZES;
    readonly filtersForm = new FormGroup({
        year: new FormControl<number | null>(REPORT_YEARS[0]),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });
    firms: Firm[] = [];

    loadingStore = false;
    loadingEmployee = false;
    loadError: string | null = null;
    activeTab = 0;
    searched = false;

    private readonly storeColumnFilterTick$ = new Subject<void>();
    private readonly employeeColumnFilterTick$ = new Subject<void>();

    readonly storeTableState = new TableState();
    readonly employeeTableState = new TableState();

    storeColumnFilters: Record<string, string> = {};
    employeeColumnFilters: Record<string, string> = {};

    get hasStoreTableColumnFilters(): boolean {
        return Object.keys(this.storeColumnFilters).length > 0;
    }

    get hasEmployeeTableColumnFilters(): boolean {
        return Object.keys(this.employeeColumnFilters).length > 0;
    }

    get isLoading(): boolean {
        return this.loadingStore || this.loadingEmployee;
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

    constructor() {
        this.storeTableState.paginator.size = PAGE_SIZES[0];
        this.employeeTableState.paginator.size = PAGE_SIZES[0];

        this.storeColumnFilterTick$.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => {
            if (!this.searched) { return; }
            this.storeTableState.paginator.page = 0;
            this.fetchStoreOnly();
        });

        this.employeeColumnFilterTick$.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => {
            if (!this.searched) { return; }
            this.employeeTableState.paginator.page = 0;
            this.fetchEmployeeOnly();
        });
    }

    ngOnInit(): void {
        this.inspectionsService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: error => { this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi')); },
        });

        // URL-də il varsa əvvəlki axtarış bərpa olunur
        const q = this.route.snapshot.queryParamMap;
        this.activeTab = queryNumber(q, 'tab') === 1 ? 1 : 0;
        const year = queryNumber(q, 'year');
        if (year == null) return;
        this.filtersForm.patchValue({ year, month: queryNumber(q, 'month'), firmId: queryNumber(q, 'firm') });
        this.storeTableState.paginator.page = queryNumber(q, PAGE_KEYS.store.page) ?? 0;
        this.storeTableState.paginator.size = queryNumber(q, PAGE_KEYS.store.size) ?? PAGE_SIZES[0];
        this.employeeTableState.paginator.page = queryNumber(q, PAGE_KEYS.employee.page) ?? 0;
        this.employeeTableState.paginator.size = queryNumber(q, PAGE_KEYS.employee.size) ?? PAGE_SIZES[0];
        this.fetchBoth();
    }

    onTabIndexChange(index: number): void {
        this.activeTab = index;
        void writeQueryState(this.router, { tab: index || null });
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
            this.fetchStoreOnly();
        }
    }

    clearEmployeeFilters(): void {
        this.employeeColumnFilters = {};
        document.querySelectorAll<HTMLInputElement>('.emp-filter-input').forEach(i => { i.value = ''; });
        if (this.searched) {
            this.employeeTableState.paginator.page = 0;
            this.fetchEmployeeOnly();
        }
    }

    onSearch(): void {
        this.storeTableState.paginator.page = 0;
        this.employeeTableState.paginator.page = 0;
        const { year, month, firmId } = this.filtersForm.getRawValue();
        void writeQueryState(this.router, { year, month, firm: firmId, page: null, epage: null });
        this.fetchBoth();
    }

    /** "Təmizlə": filtrlər standart dəyərə qayıdır, nəticə və URL təmizlənir */
    clearAll(): void {
        this.filtersForm.reset({ year: REPORT_YEARS[0], month: null, firmId: null });
        this.storeColumnFilters = {};
        this.employeeColumnFilters = {};
        document.querySelectorAll<HTMLInputElement>('.store-filter-input, .emp-filter-input').forEach(i => { i.value = ''; });
        this.searched = false;
        this.loadError = null;
        this.storeDataSource.data = [];
        this.employeeDataSource.data = [];
        this.storeTotal = 0;
        this.employeeTotal = 0;
        void writeQueryState(this.router, { year: null, month: null, firm: null, page: null, size: null, epage: null, esize: null });
    }

    onPage(tab: Tab, e: PageEvent): void {
        const state = tab === 'store' ? this.storeTableState : this.employeeTableState;
        state.paginator.page = e.pageIndex;
        state.paginator.size = e.pageSize;
        const keys = PAGE_KEYS[tab];
        void writeQueryState(this.router, {
            [keys.page]: e.pageIndex || null,
            [keys.size]: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize,
        });
        if (tab === 'store') { this.fetchStoreOnly(); } else { this.fetchEmployeeOnly(); }
    }

    fetchBoth(): void {
        this.searched = true;
        this.loadError = null;
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
            }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: ({ store, employee }) => {
                this.applyStoreResponse(store);
                this.applyEmployeeResponse(employee);
            },
            error: error => {
                this.loadError = apiErrorMessage(error, 'Hesabat yüklənmədi. İnternet bağlantısını və ya icazəni yoxlayın.');
            },
        });
    }

    private fetchStoreOnly(): void {
        this.syncTableStatesFromForm();
        this.loadingStore = true;
        this.loadError = null;
        this.reportsService.getInspectionDetailsByStoreRegion(this.storeTableState).pipe(
            finalize(() => { this.loadingStore = false; }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: res => this.applyStoreResponse(res),
            error: error => { this.loadError = apiErrorMessage(error, 'Mağaza hesabatı yüklənmədi'); },
        });
    }

    private fetchEmployeeOnly(): void {
        this.syncTableStatesFromForm();
        this.loadingEmployee = true;
        this.loadError = null;
        this.reportsService.getInspectionDetailsByInspector(this.employeeTableState).pipe(
            finalize(() => { this.loadingEmployee = false; }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: res => this.applyEmployeeResponse(res),
            error: error => { this.loadError = apiErrorMessage(error, 'Əməkdaş hesabatı yüklənmədi'); },
        });
    }

    private syncTableStatesFromForm(): void {
        const base = this.formFilters();
        this.storeTableState.filter = { ...base, ...this.columnFilters(this.storeColumnFilters, this.storeColToApi) };
        this.storeTableState.searchTerm = '';
        this.employeeTableState.filter = { ...base, ...this.columnFilters(this.employeeColumnFilters, this.employeeColToApi) };
        this.employeeTableState.searchTerm = '';
    }

    private formFilters(): Record<string, string> {
        const { year, month, firmId } = this.filtersForm.getRawValue();
        const f: Record<string, string> = {};
        if (year != null) { f['year'] = String(year); }
        if (month != null) { f['month'] = String(month); }
        if (firmId != null) { f['firmId'] = String(firmId); }
        return f;
    }

    private columnFilters(values: Record<string, string>, toApi: Record<string, string>): Record<string, string> {
        const f: Record<string, string> = {};
        for (const [col, val] of Object.entries(values)) {
            const apiKey = toApi[col];
            if (apiKey && val) { f[apiKey] = val; }
        }
        return f;
    }

    private applyStoreResponse(res: { data?: ReportPageWithTotals }): void {
        const items = res?.data?.items ?? [];
        this.storeTotal = res?.data?.total ?? items.length;
        this.storeSums = { planli_say: res?.data?.plannedTotal ?? 0, plandankanar_say: res?.data?.unPlannedTotal ?? 0 };
        const { page, size } = this.storeTableState.paginator;
        this.storeDataSource.data = items.map((raw, i) => this.normalizeStoreRow(raw, page * size + i + 1));
    }

    private applyEmployeeResponse(res: { data?: ReportPageWithTotals }): void {
        const items = res?.data?.items ?? [];
        this.employeeTotal = res?.data?.total ?? items.length;
        this.employeeSums = { planli_say: res?.data?.plannedTotal ?? 0, plandankanar_say: res?.data?.unPlannedTotal ?? 0 };
        const { page, size } = this.employeeTableState.paginator;
        this.employeeDataSource.data = items.map((raw, i) => this.normalizeEmployeeRow(raw, page * size + i + 1));
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

    // Səhifələmə serverdədir: cədvəldə yalnız cari səhifə var, cəmlər isə bütün filtrlənmiş
    // sətirlər üzrə serverdən gəlir.
    getStoreTotal(field: 'planli_say' | 'plandankanar_say'): number {
        return this.storeSums[field];
    }

    getEmployeeTotal(field: 'planli_say' | 'plandankanar_say'): number {
        return this.employeeSums[field];
    }

    /** İxrac üçün cari səhifə yox, filtrə uyğun bütün sətirlər (page = -1 serverdə səhifələməni söndürür). */
    private async fetchAllRows(tab: Tab): Promise<any[]> {
        const source = tab === 'store' ? this.storeTableState : this.employeeTableState;
        const state = { ...source, paginator: { ...source.paginator, page: -1 } } as TableState;
        const res: { data?: ReportPageWithTotals } = await firstValueFrom(tab === 'store'
            ? this.reportsService.getInspectionDetailsByStoreRegion(state)
            : this.reportsService.getInspectionDetailsByInspector(state));
        const items = res?.data?.items ?? [];
        return tab === 'store'
            ? items.map((raw, i) => this.normalizeStoreRow(raw, i + 1))
            : items.map((raw, i) => this.normalizeEmployeeRow(raw, i + 1));
    }

    private get activeTabKey(): Tab {
        return this.activeTab === 0 ? 'store' : 'employee';
    }

    async exportExcel(): Promise<void> {
        const tab = this.activeTabKey;
        const all = await this.fetchAllRows(tab);
        const data = tab === 'store'
            ? all.map((r: any) => ({
                '№': r.row, 'Mağaza kodu': r.magaza_kodu, 'Mağaza adı': r.magaza_adi,
                'Bölgə': r.bolge, 'Planlı yoxlama sayı': r.planli_say, 'Plandankənar yoxlama sayı': r.plandankanar_say,
            }))
            : all.map((r: any) => ({
                '№': r.row, 'İstifadəçi kodu': r.user_kodu, 'Əməkdaş adı': r.emekdas_adi,
                'Planlı yoxlama sayı': r.planli_say, 'Plandankənar yoxlama sayı': r.plandankanar_say,
            }));
        await this.fileExport.exportRowsToExcel(
            data,
            tab === 'store' ? 'Mağaza bazında' : 'Əməkdaş bazında',
            datedFileName(`yoxlama-statistikasi-${tab}`, 'xlsx'),
        );
    }

    async exportPdf(): Promise<void> {
        const tab = this.activeTabKey;
        const isStore = tab === 'store';
        const all = await this.fetchAllRows(tab);
        const headers = isStore
            ? ['№', 'Mağaza kodu', 'Mağaza adı', 'Bölgə', 'Planlı yoxlama sayı', 'Plandankənar yoxlama sayı']
            : ['№', 'İstifadəçi kodu', 'Əməkdaş adı və soyadı', 'Planlı yoxlama sayı', 'Plandankənar yoxlama sayı'];
        const rows = isStore
            ? all.map((r: any) => [r.row, r.magaza_kodu, r.magaza_adi, r.bolge, r.planli_say, r.plandankanar_say])
            : all.map((r: any) => [r.row, r.user_kodu, r.emekdas_adi, r.planli_say, r.plandankanar_say]);
        // PDF-də başlıq neytraldır: rəng məna daşımır
        const pdf = chartColors();
        const docDef: any = {
            content: [{ table: { headerRows: 1, body: [headers.map(h => ({ text: h, style: 'th' })), ...rows] }, layout: 'lightHorizontalLines' }],
            styles: { th: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 9 } },
            defaultStyle: { fontSize: 9 }
        };
        void this.fileExport.exportPdf(docDef, datedFileName(`yoxlama-statistikasi-${tab}`, 'pdf'));
    }
}

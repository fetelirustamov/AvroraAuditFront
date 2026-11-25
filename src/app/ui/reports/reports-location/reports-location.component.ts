import { NgFor, NgClass, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ComplianceTonePipe } from '../../../shared/pipes/compliance-tone.pipe';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { chartColors } from '../../../shared/utils/chart-colors';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { TableService } from '../../services/table.service';
import { MONTH_OPTIONS, PAGE_SIZES, REPORT_YEARS } from '../report-filters';

type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec';
const MONTH_KEYS: MonthKey[] = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** POST /api/reports/monthly cavabındakı bir məkan sətri. */
interface MonthlyLocationReportRow {
    locationCode: number;
    locationName: string;
    regionName: string;
    months: { month: number; score: number | null; ncCount: number }[];
}

// Menyuda deyil (qəsdən, bax CLAUDE.md: SQL real datada yoxlanmayıb): yalnız URL ilə açılır.
@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [
        NgIf, NgClass, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault, ReactiveFormsModule,
        MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatMenuModule, MatProgressBarModule,
        PageHeaderComponent, ListStateComponent, ComplianceTonePipe,
    ],
    templateUrl: './reports-location.component.html',
    styleUrl: './reports-location.component.scss'
})
export class ReportsComponent implements OnInit {
    private readonly tableService = inject(TableService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly notify = inject(NotificationService);
    private readonly fileExport = inject(FileExportService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    firms: Firm[] = [];
    readonly years = REPORT_YEARS;
    readonly pageSizes = PAGE_SIZES;
    readonly months = MONTH_OPTIONS.map((m, i) => ({ ...m, key: MONTH_KEYS[i] }));
    /** Hər ay üçün iki sütun: checklist nəticəsi və uyğunsuzluq sayı. */
    readonly monthColumns = this.months.flatMap(m => ([
        { key: `${m.key}Score`, label: 'Checklist nəticəsi' },
        { key: `${m.key}NcCount`, label: 'Uyğunsuzluq sayı' },
    ]));

    readonly filtersForm = new FormGroup({
        firmId: new FormControl<number | null>(null, { validators: [Validators.required] }),
        year: new FormControl<number | null>(REPORT_YEARS[0]),
        month: new FormControl<number | null>(null)
    });

    searched = false;
    isLoading = false;
    loadError: string | null = null;
    dataSource = new MatTableDataSource<any>([]);
    allCount = 0;
    pageIndex = 0;
    pageSize = PAGE_SIZES[0];
    private readonly tableState = new TableState();
    private readonly filterSubject = new Subject<{ key: string, value: string }>();

    readonly baseColumns = [
        { key: 'row', label: 'Sıra' },
        { key: 'branchName', label: 'Mağaza adı' },
        { key: 'branchCode', label: 'Mağaza kodu' }
    ];
    readonly displayedColumns = [...this.baseColumns, ...this.monthColumns].map(c => c.key);
    readonly filterColumns = this.displayedColumns.map(k => `${k}__filter`);
    readonly groupColumns = [
        { key: 'group-general', label: 'Ümumi məlumatlar', colspan: this.baseColumns.length },
        ...this.months.map(m => ({ key: `group-${m.key}`, label: m.label, colspan: 2 }))
    ];
    readonly groupHeaderColumnKeys = this.groupColumns.map(g => g.key);

    constructor() {
        this.filterSubject.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(({ key, value }) => {
            if (value) {
                this.tableState.filter[key] = value;
            } else {
                delete this.tableState.filter[key];
            }
            if (!this.searched) return;
            this.pageIndex = 0;
            this.fetch();
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
        this.filtersForm.patchValue({ firmId, year: queryNumber(q, 'year') ?? REPORT_YEARS[0], month: queryNumber(q, 'month') });
        this.pageIndex = queryNumber(q, 'page') ?? 0;
        this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];
        this.applyFormFilter();
        this.fetch();
    }

    onSearch(): void {
        if (this.filtersForm.invalid) {
            this.filtersForm.markAllAsTouched();
            this.notify.warning('Firma seçin');
            return;
        }
        const { firmId, year, month } = this.filtersForm.getRawValue();
        this.pageIndex = 0;
        void writeQueryState(this.router, { firm: firmId, year, month, page: null });
        this.applyFormFilter();
        this.fetch();
    }

    /** "Təmizlə": filtrlər standart dəyərə qayıdır, nəticə və URL təmizlənir */
    clearAll(): void {
        this.filtersForm.reset({ firmId: null, year: REPORT_YEARS[0], month: null });
        this.tableState.filter = {};
        document.querySelectorAll<HTMLInputElement>('.monthly-filter-input').forEach(i => { i.value = ''; });
        this.searched = false;
        this.loadError = null;
        this.dataSource.data = [];
        this.allCount = 0;
        void writeQueryState(this.router, { firm: null, year: null, month: null, page: null, size: null });
    }

    onPage(e: PageEvent): void {
        this.pageIndex = e.pageIndex;
        this.pageSize = e.pageSize;
        void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
        this.fetch();
    }

    private applyFormFilter(): void {
        const { firmId, year, month } = this.filtersForm.getRawValue();
        const f = this.tableState.filter;
        for (const [key, value] of Object.entries({ firmId, year, month })) {
            if (value != null) { f[key] = String(value); } else { delete f[key]; }
        }
    }

    applyColumnFilter(event: Event, key: string): void {
        const inputValue = (event.target as HTMLInputElement).value.trim();
        this.filterSubject.next({ key, value: inputValue });
    }

    fetch(): void {
        this.searched = true;
        this.isLoading = true;
        this.loadError = null;
        this.tableService.api_url = 'reports/monthly';
        this.tableState.paginator.page = this.pageIndex;
        this.tableState.paginator.size = this.pageSize;
        this.tableService.fill(this.tableState)
            .pipe(finalize(() => this.isLoading = false), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: any) => {
                    // TableService xətanı udur və `success: false` qaytarır
                    if (res?.success === false) {
                        this.loadError = res.message || 'Hesabat yüklənmədi';
                        return;
                    }
                    const items: MonthlyLocationReportRow[] = res?.data?.items ?? [];
                    this.dataSource.data = items.map(item => this.toTableRow(item));
                    this.allCount = res?.data?.total ?? 0;
                },
                error: error => { this.loadError = apiErrorMessage(error, 'Hesabat yüklənmədi'); },
            });
    }

    /** API sətrini (məkan + ay siyahısı) cədvəlin gözlədiyi düz obyektə çevirir. */
    private toTableRow(item: MonthlyLocationReportRow): any {
        const row: any = {
            branchName: item.locationName,
            branchCode: item.locationCode,
            regionName: item.regionName
        };
        // Məlumatı olmayan aylar boş qalır
        for (const m of this.months) {
            row[`${m.key}Score`] = '';
            row[`${m.key}NcCount`] = '';
        }
        for (const cell of item.months ?? []) {
            const month = this.months.find(m => m.value === cell.month);
            if (!month) continue;
            row[`${month.key}Score`] = cell.score != null ? Number(cell.score).toFixed(2) : '';
            row[`${month.key}NcCount`] = cell.ncCount ?? 0;
        }
        return row;
    }

    rowNumber(index: number): number {
        return this.pageIndex * this.pageSize + index + 1;
    }

    exportExcel(): void {
        const data = this.dataSource.data.map((row: any, i: number) => {
            const result: any = {
                'Sıra': i + 1,
                'Mağaza adı': row.branchName,
                'Mağaza kodu': row.branchCode,
            };
            for (const m of this.months) {
                result[`${m.label} - Checklist`] = row[`${m.key}Score`];
                result[`${m.label} - Uyğunsuzluq`] = row[`${m.key}NcCount`];
            }
            return result;
        });
        void this.fileExport.exportRowsToExcel(
            data,
            'Aylıq',
            datedFileName('reports-monthly', 'xlsx'),
        );
    }

    exportPdf(): void {
        const baseHeaders = ['Sıra', 'Mağaza adı', 'Mağaza kodu'];
        const headers = [
            ...baseHeaders,
            ...this.months.flatMap(m => [`${m.label}`, `${m.label}`])
        ];
        const subHeaders = [
            ...Array(baseHeaders.length).fill(''),
            ...this.months.flatMap(() => ['Checklist', 'Uyğunsuzluq'])
        ];
        const widths = [30, '*', 70, ...this.months.flatMap(() => [70, 80])];

        const tableBody: any[] = [];
        tableBody.push(headers.map((h, idx) => ({ text: h, style: idx < baseHeaders.length ? 'tableHeader' : 'tableHeaderPair' })));
        tableBody.push(subHeaders.map((h, idx) => ({ text: h, style: idx < baseHeaders.length ? 'tableHeader' : 'tableHeaderSub' })));
        for (let i = 0; i < this.dataSource.data.length; i++) {
            const row = this.dataSource.data[i];
            const rowArr: any[] = [
                String(i + 1),
                String(row.branchName ?? ''),
                String(row.branchCode ?? ''),
            ];
            for (const m of this.months) {
                rowArr.push(String(row[`${m.key}Score`] ?? ''));
                rowArr.push(String(row[`${m.key}NcCount`] ?? ''));
            }
            tableBody.push(rowArr);
        }

        // PDF-də başlıq neytraldır: rəng məna daşımır
        const pdf = chartColors();
        const docDefinition: any = {
            pageOrientation: 'landscape',
            content: [
                {
                    table: { headerRows: 2, widths, body: tableBody },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                tableHeader: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 9 },
                tableHeaderPair: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 9, alignment: 'center' },
                tableHeaderSub: { bold: true, color: pdf.textStrong, fillColor: pdf.surfaceSubtle, fontSize: 8 }
            },
            defaultStyle: { fontSize: 8 }
        };
        void this.fileExport.exportPdf(docDefinition, datedFileName('reports-monthly', 'pdf'));
    }
}

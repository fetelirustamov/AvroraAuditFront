// ... existing code ...
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, Subject, finalize } from 'rxjs';
import { TableService } from '../../services/table.service';
import { TableState } from '../../../models/table-state.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { MatMenuModule } from '@angular/material/menu';
import { Firm } from '../../inspections/firm.model';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { NotificationService } from '../../../shared/services/notification.service';

type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec';

/** POST /api/reports/monthly cavabındakı bir məkan sətri. */
interface MonthlyLocationReportRow {
    locationCode: number;
    locationName: string;
    regionName: string;
    months: { month: number; score: number | null; ncCount: number }[];
}

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [
        CommonModule,
        NgIf,
        NgFor,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        AuditLoadingOverlayComponent,
        MatMenuModule
    ],
    templateUrl: './reports-location.component.html',
    styleUrl: './reports-location.component.scss'
})
export class ReportsComponent {
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    public firms: Firm[] = [];
    public years: number[] = [];
    public months: { value: number, label: string, key: MonthKey }[] = [
        { value: 1, label: 'Yanvar', key: 'jan' },
        { value: 2, label: 'Fevral', key: 'feb' },
        { value: 3, label: 'Mart', key: 'mar' },
        { value: 4, label: 'Aprel', key: 'apr' },
        { value: 5, label: 'May', key: 'may' },
        { value: 6, label: 'İyun', key: 'jun' },
        { value: 7, label: 'İyul', key: 'jul' },
        { value: 8, label: 'Avqust', key: 'aug' },
        { value: 9, label: 'Sentyabr', key: 'sep' },
        { value: 10, label: 'Oktyabr', key: 'oct' },
        { value: 11, label: 'Noyabr', key: 'nov' },
        { value: 12, label: 'Dekabr', key: 'dec' }
    ];
    /** Hər ay üçün iki sütun: checklist nəticəsi və uyğunsuzluq sayı. */
    public monthColumns: { key: string, label: string }[] = [];

    public filtersForm = new FormGroup({
        firmId: new FormControl<number | null>(null, { nonNullable: false, validators: [Validators.required] }),
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null)
    });

    public isLoading = false;
    public rows: any[] = [];
    public dataSource: MatTableDataSource<any> = new MatTableDataSource<any>([]);
    public allCount = 0;
    private tableState: TableState = new TableState();
    private filterSubject = new Subject<{ key: string, value: string }>();
    public submitted = false;

    // Column configuration (static keys to match backend)
    public baseColumns = [
        { key: 'row', label: 'Sıra' },
        { key: 'branchName', label: 'Məkanın Adı' },
        { key: 'branchCode', label: 'Məkan Kodu' }
    ];

    public displayedColumns: string[] = [];
    public headerColumns: string[] = this.displayedColumns;
    public filterColumns: string[] = this.displayedColumns.map(k => `${k}__filter`);
    public groupColumns: { key: string; label: string; colspan: number }[] = [];
    public groupHeaderColumnKeys: string[] = [];

    constructor(
        private tableService: TableService,
        private inspectionsService: InspectionsService,
        private notify: NotificationService,
        private fileExport: FileExportService,
    ) {
        this.tableService.api_url = 'reports/monthly';
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = 10;
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 5; y--) {
            this.years.push(y);
        }
        this.loadFirms();

        this.filterSubject.pipe(debounceTime(400)).subscribe(({ key, value }) => {
            if (value) {
                this.tableState.filter[key] = value;
            } else {
                delete this.tableState.filter[key];
            }
            this.fetch();
        });

        // Hər ay bir qrup başlığıdır; altında iki sütun durur
        this.monthColumns = this.months.flatMap(m => ([
            { key: `${m.key}Score`, label: 'Checklist Nəticəsi' },
            { key: `${m.key}NcCount`, label: 'Uyğunsuzluq Sayı' },
        ]));

        this.displayedColumns = [...this.baseColumns, ...this.monthColumns].map(c => c.key);
        this.headerColumns = this.displayedColumns;
        this.filterColumns = this.displayedColumns.map(k => `${k}__filter`);

        this.groupColumns = [
            { key: 'group-general', label: 'ÜMUMİ MƏLUMATLAR', colspan: this.baseColumns.length },
            ...this.months.map(m => ({ key: `group-${m.key}`, label: m.label.toUpperCase(), colspan: 2 }))
        ];
        this.groupHeaderColumnKeys = this.groupColumns.map(g => g.key);
    }

    ngAfterViewInit(): void {
        // Səhifələmə serverdədir: paginator hadisəsi tableState-i yeniləyib yenidən sorğu atır
        this.paginator?.page.subscribe(() => {
            this.tableState.paginator.page = this.paginator.pageIndex;
            this.tableState.paginator.size = this.paginator.pageSize;
            this.fetch();
        });
    }

    private loadFirms() {
        this.inspectionsService.getFirms().subscribe(res => {
            this.firms = res.data;
        });
    }

    onSearch() {
        this.submitted = true;
        if (this.filtersForm.invalid) {
            this.filtersForm.markAllAsTouched();
            return;
        }
        const { firmId, year, month } = this.filtersForm.value;
        this.tableState.filter = this.tableState.filter || {};
        if (firmId != null) this.tableState.filter['firmId'] = String(firmId);
        if (year != null) this.tableState.filter['year'] = String(year);
        if (month != null) this.tableState.filter['month'] = String(month);
        this.fetch();
    }

    applyColumnFilter(event: Event, key: string) {
        const inputValue = (event.target as HTMLInputElement).value.trim();
        this.filterSubject.next({ key, value: inputValue });
    }

    private fetch() {
        this.isLoading = true;
        this.tableService.fill(this.tableState)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: (res: any) => {
                    const items: MonthlyLocationReportRow[] = res?.data?.items ?? [];
                    this.rows = items.map(item => this.toTableRow(item));
                    this.allCount = res?.data?.total ?? 0;
                    this.dataSource.data = this.rows;
                },
                error: () => {
                    this.rows = [];
                    this.allCount = 0;
                    this.dataSource.data = [];
                    this.notify.error('Hesabat yüklənmədi');
                }
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

    getRowNumber(index: number): number {
        return this.paginator ? index + 1 + (this.paginator.pageIndex * this.paginator.pageSize) : index + 1;
    }

    exportExcel(): void {
        const data = this.dataSource.data.map((row: any, i: number) => {
            const result: any = {
                Sira: i + 1,
                'Məkanın Adı': row.branchName,
                'Məkan Kodu': row.branchCode,
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
        const baseHeaders = ['Sıra', 'Məkanın Adı', 'Məkan Kodu'];
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

        const docDefinition: any = {
            pageOrientation: 'landscape',
            content: [
                {
                    table: { headerRows: 2, widths, body: tableBody },
                    layout: 'lightHorizontalLines'
                }
            ],
            styles: {
                tableHeader: { bold: true, color: 'white', fillColor: '#1976d2', fontSize: 9 },
                tableHeaderPair: { bold: true, color: 'white', fillColor: '#1976d2', fontSize: 9, alignment: 'center' },
                tableHeaderSub: { bold: true, color: 'white', fillColor: '#1976d2', fontSize: 8 }
            },
            defaultStyle: { fontSize: 8 }
        };
        void this.fileExport.exportPdf(docDefinition, datedFileName('reports-monthly', 'pdf'));
    }
}



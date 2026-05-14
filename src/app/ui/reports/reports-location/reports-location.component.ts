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
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { MatMenuModule } from '@angular/material/menu';
import { Firm } from '../../inspections/firm.model';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';

type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec';

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
    public monthPairs: { key: string, label: string, left: MonthKey, right: MonthKey }[] = [];

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
    private columnFilters: Record<string, string> = {};
    private allRows: any[] = [];
    public submitted = false;

    // Column configuration (static keys to match backend)
    public baseColumns = [
        { key: 'row', label: 'Sıra' },
        { key: 'branchName', label: 'Məkanın Adı' },
        { key: 'branchCode', label: 'Məkan Kodu' }
    ];

    public pairColumns: { key: string, label: string }[] = [];

    public displayedColumns: string[] = [];
    public headerColumns: string[] = this.displayedColumns;
    public filterColumns: string[] = this.displayedColumns.map(k => `${k}__filter`);
    public groupColumns: { key: string; label: string; colspan: number }[] = [];
    public groupHeaderColumnKeys: string[] = [];

    constructor(
        private tableService: TableService,
        private inspectionsService: InspectionsService,
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

        // Build month pairs and columns (Jan-Feb, Mar-Apr, ...)
        for (let i = 0; i < this.months.length; i += 2) {
            const left = this.months[i];
            const right = this.months[i + 1];
            this.monthPairs.push({ key: `${left.key}_${right.key}`, label: `${left.label} ${right?.label ?? ''}`.trim(), left: left.key, right: (right?.key ?? left.key) });
        }
        this.pairColumns = this.monthPairs.flatMap(p => ([
            { key: `${p.key}Score`, label: `Checklist Nəticəsi` },
            { key: `${p.key}NcCount`, label: `Uyğunsuzluq Sayı` },
        ]));

        this.displayedColumns = [...this.baseColumns, ...this.pairColumns].map(c => c.key);
        this.headerColumns = this.displayedColumns;
        this.filterColumns = this.displayedColumns.map(k => `${k}__filter`);

        // Build grouped header metadata (pair labels)
        this.groupColumns = [
            { key: 'group-general', label: 'ÜMUMİ MƏLUMATLAR', colspan: this.baseColumns.length }
        ];
        for (const p of this.monthPairs) {
            this.groupColumns.push({ key: `group-${p.key}`, label: p.label.toUpperCase(), colspan: 2 });
        }
        this.groupHeaderColumnKeys = this.groupColumns.map(g => g.key);
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
        // Keep local state for client-side filtering
        if (inputValue) {
            this.columnFilters[key] = inputValue.toLowerCase();
        } else {
            delete this.columnFilters[key];
        }
    }

    private fetch() {
        this.isLoading = true;
        // Show fake data with client-side per-column filters
        if (this.tableService.api_url === 'reports/monthly') {
            if (this.allRows.length === 0) {
                this.allRows = this.generateFakeRows(25);
            }
            this.rows = this.applyLocalFilters(this.allRows);
            this.allCount = this.rows.length;
            this.dataSource.data = this.rows;
            if (this.paginator) {
                this.dataSource.paginator = this.paginator;
            }
            this.isLoading = false;
            return;
        }

        this.tableService.fill(this.tableState)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe(res => {
                this.rows = res?.data?.items ?? [];
                this.allCount = res?.data?.total ?? 0;
                this.dataSource.data = this.rows;
                if (this.paginator) {
                    this.dataSource.paginator = this.paginator;
                }
            });
    }

    private generateFakeRows(count: number): any[] {
        const list: any[] = [];
        for (let i = 0; i < count; i++) {
            const base: any = {
                row: i + 1,
                branchName: `Məkan ${i + 1}`,
                branchCode: `C${(1000 + i).toString()}`,
            };
            for (const p of this.monthPairs) {
                base[`${p.key}Score`] = (80 + Math.random() * 20).toFixed(2);
                base[`${p.key}NcCount`] = Math.floor(Math.random() * 5);
            }
            list.push(base);
        }
        return list;
    }

    private applyLocalFilters(source: any[]): any[] {
        const entries = Object.entries(this.columnFilters);
        if (entries.length === 0) return [...source];
        return source.filter(row => {
            for (const [key, val] of entries) {
                const cell = row[key];
                if (cell == null) return false;
                const text = String(cell).toLowerCase();
                if (!text.includes(val)) return false;
            }
            return true;
        });
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
            for (const p of this.monthPairs) {
                result[`${p.label} - Checklist`] = row[`${p.key}Score`];
                result[`${p.label} - Uyğunsuzluq`] = row[`${p.key}NcCount`];
            }
            return result;
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Aylıq');
        XLSX.writeFile(workbook, `reports-monthly-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    exportPdf(): void {
        const vfs: any = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;
        (pdfMake as any).vfs = vfs;
        const baseHeaders = ['Sıra', 'Məkanın Adı', 'Məkan Kodu'];
        const headers = [
            ...baseHeaders,
            ...this.monthPairs.flatMap(p => [`${p.label}`, `${p.label}`])
        ];
        const subHeaders = [
            ...Array(baseHeaders.length).fill(''),
            ...this.monthPairs.flatMap(() => ['Checklist', 'Uyğunsuzluq'])
        ];
        const widths = [30, '*', 70, ...this.monthPairs.flatMap(() => [70, 80])];

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
            for (const p of this.monthPairs) {
                rowArr.push(String(row[`${p.key}Score`] ?? ''));
                rowArr.push(String(row[`${p.key}NcCount`] ?? ''));
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
        pdfMake.createPdf(docDefinition).download(`reports-monthly-${new Date().toISOString().slice(0, 10)}.pdf`);
    }
}



import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';

/** Saxta sətir — backend gələndə əvəz olunacaq */
interface FakeReportRow {
    firmId: number;
    year: number;
    month: number;
    bolge: string;
    magaza_kodu: string;
    magaza_adi: string;
    sobeler: string;
    uygunsuzluq_tasnifat: string;
    say_sobe: number;
    say_tasnifat: number;
}

@Component({
    selector: 'app-uygunsuzluq-tasnifat-hesabati',
    standalone: true,
    imports: [
        CommonModule, NgIf, NgFor, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatSelectModule,
        MatTableModule, MatPaginatorModule, MatMenuModule,
    ],
    templateUrl: './nonconformity-category-report.component.html',
    styleUrl: './nonconformity-category-report.component.scss',
})
export class UygunsuzluqTasnifatHesabatiComponent implements OnDestroy {
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    columns = [
        { key: 'row', label: '№' },
        { key: 'bolge', label: 'Bölgəsi' },
        { key: 'magaza_kodu', label: 'Ərazi kodu' },
        { key: 'magaza_adi', label: 'Ərazi adı' },
        { key: 'sobeler', label: 'Şöbələr' },
        { key: 'uygunsuzluq_tasnifat', label: 'Uyğunsuzluq təsnifatı' },
        { key: 'say_sobe', label: 'Şöbələr üzrə uyğunsuzluq sayı' },
        { key: 'say_tasnifat', label: 'Uyğunsuzluq təsnifatı üzrə uyğunsuzluq sayı' },
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
    pageIndex = 0;
    pageSize = 10;

    private fakePool: FakeReportRow[] = [];
    private baseAfterFormFilter: FakeReportRow[] = [];
    private columnFilters: Record<string, string> = {};
    /** Sütun filtrlərindən sonra qalan sətirlər (KPI cəmləri üçün) */
    private filteredRows: FakeReportRow[] = [];

    private readonly destroy$ = new Subject<void>();
    private readonly columnFilterSubject = new Subject<{ key: string; value: string }>();
    private poolFirmIdsKey = '';

    get filterColumns(): string[] {
        return this.columns.map(c => c.key + '__filter');
    }

    get hasActiveColumnFilters(): boolean {
        return Object.keys(this.columnFilters).length > 0;
    }

    constructor(
        private inspectionsService: InspectionsService,
        private notify: NotificationService,
    ) {
        this.inspectionsService.getFirms().pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.firms = res.data ?? [];
                this.ensureFakePool();
            },
            error: () => { this.notify.error('Firmalar yüklənmədi'); this.ensureFakePool(); },
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

    private applyColumnFilterDebounced(key: string, value: string): void {
        if (value) {
            this.columnFilters[key] = value.toLowerCase();
        } else {
            delete this.columnFilters[key];
        }
        if (!this.hasSubmittedSearch) { return; }
        this.pageIndex = 0;
        this.paginator?.firstPage();
        this.refreshTable();
    }

    clearFilters(): void {
        this.columnFilters = {};
        document.querySelectorAll<HTMLInputElement>(`.${this.filterInputClass}`).forEach(i => { i.value = ''; });
        if (!this.hasSubmittedSearch) { return; }
        this.pageIndex = 0;
        this.paginator?.firstPage();
        this.refreshTable();
    }

    onSearch(): void {
        this.ensureFakePool();
        this.hasSubmittedSearch = true;
        this.pageIndex = 0;
        this.paginator?.firstPage();
        this.applyFormFilterBase();
        this.refreshTable();
    }

    onPage(e: PageEvent): void {
        if (!this.hasSubmittedSearch) { return; }
        this.pageIndex = e.pageIndex;
        this.pageSize = e.pageSize;
        this.refreshTable();
    }

    getTotalSaySobe(): number {
        return this.filteredRows.reduce((s, r) => s + r.say_sobe, 0);
    }

    getTotalSayTasnifat(): number {
        return this.filteredRows.reduce((s, r) => s + r.say_tasnifat, 0);
    }

    exportExcel(): void {
        const data = this.dataSource.data.map((r: any) => ({
            '№': r.row,
            'Bölgəsi': r.bolge,
            'Ərazi kodu': r.magaza_kodu,
            'Ərazi adı': r.magaza_adi,
            'Şöbələr': r.sobeler,
            'Uyğunsuzluq təsnifatı': r.uygunsuzluq_tasnifat,
            'Şöbələr üzrə uyğunsuzluq sayı': r.say_sobe,
            'Uyğunsuzluq təsnifatı üzrə uyğunsuzluq sayı': r.say_tasnifat,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Uyğunsuzluq təsnifatı');
        XLSX.writeFile(wb, `uygunsuzluq-tasnifat-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    exportPdf(): void {
        const vfs: any = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;
        (pdfMake as any).vfs = vfs;
        const labels = this.columns.map(c => (c.key === 'row' ? '№' : c.label));
        const rows = this.dataSource.data.map((r: any) =>
            this.columns.map(c => String(r[c.key] ?? '')));
        const docDef: any = {
            pageOrientation: 'landscape',
            content: [{
                table: {
                    headerRows: 1,
                    widths: Array(labels.length).fill('auto'),
                    body: [
                        labels.map((h: string) => ({ text: h, style: 'th' })),
                        ...rows.map((cells: string[]) => cells.map(t => ({ text: t, fontSize: 7 }))),
                    ],
                },
                layout: 'lightHorizontalLines',
            }],
            styles: { th: { bold: true, color: '#fff', fillColor: '#605DFF', fontSize: 8 } },
            defaultStyle: { fontSize: 7 },
        };
        pdfMake.createPdf(docDef).download(`uygunsuzluq-tasnifat-${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    private ensureFakePool(): void {
        const firmIds = this.firms.length ? this.firms.map(f => f.id) : [1, 2, 3];
        const key = firmIds.slice().sort((a, b) => a - b).join(',');
        if (this.fakePool.length > 0 && this.poolFirmIdsKey === key) { return; }
        this.poolFirmIdsKey = key;
        this.fakePool = this.generateFakeRows(firmIds);
    }

    private applyFormFilterBase(): void {
        const { year, month, firmId } = this.filtersForm.value;
        this.baseAfterFormFilter = this.fakePool.filter(row => {
            if (year != null && row.year !== year) { return false; }
            if (month != null && row.month !== month) { return false; }
            if (firmId != null && row.firmId !== firmId) { return false; }
            return true;
        });
    }

    private rowMatchesColumnFilters(row: FakeReportRow): boolean {
        for (const [key, needle] of Object.entries(this.columnFilters)) {
            let cell: string;
            if (key === 'say_sobe' || key === 'say_tasnifat') {
                cell = String((row as any)[key]);
            } else {
                cell = String((row as any)[key] ?? '').toLowerCase();
            }
            if (!cell.includes(needle)) { return false; }
        }
        return true;
    }

    private refreshTable(): void {
        const filtered = this.baseAfterFormFilter.filter(r => this.rowMatchesColumnFilters(r));
        this.filteredRows = filtered;
        this.allCount = filtered.length;
        const start = this.pageIndex * this.pageSize;
        const slice = filtered.slice(start, start + this.pageSize);
        this.dataSource.data = slice.map((item, idx) => ({
            row: start + idx + 1,
            bolge: item.bolge,
            magaza_kodu: item.magaza_kodu,
            magaza_adi: item.magaza_adi,
            sobeler: item.sobeler,
            uygunsuzluq_tasnifat: item.uygunsuzluq_tasnifat,
            say_sobe: item.say_sobe,
            say_tasnifat: item.say_tasnifat,
        }));
    }

    private generateFakeRows(firmIds: number[]): FakeReportRow[] {
        const magazalar: { kod: string; ad: string; bolge: string }[] = [
            { kod: 'MGZ-101', ad: 'Nərimanov filialı', bolge: 'Bakı' },
            { kod: 'MGZ-102', ad: '28 May filialı', bolge: 'Bakı' },
            { kod: 'MGZ-201', ad: 'Gəncə mərkəz', bolge: 'Gəncə' },
            { kod: 'MGZ-301', ad: 'Sumqayıt plaza', bolge: 'Sumqayıt' },
            { kod: 'MGZ-401', ad: 'Şəki bazar', bolge: 'Şəki' },
            { kod: 'MGZ-501', ad: 'Lənkəran outlet', bolge: 'Lənkəran' },
            { kod: 'MGZ-601', ad: 'Mingəçevir park', bolge: 'Mingəçevir' },
        ];
        const sobeler = ['Satış', 'Anbar', 'Kassa', 'Müştəri xidməti', 'İnzibati'];
        const tasnifatlar = [
            'Sanitariya', 'Qiymət etiketi', 'Müddət', 'Soyuq zəncir',
            'Personal uniforması', 'Təhlükəsizlik', 'Qablaşdırma',
        ];
        const rows: FakeReportRow[] = [];
        const years = this.years;
        let seed = 42;
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };

        for (let i = 0; i < 180; i++) {
            const m = magazalar[Math.floor(rnd() * magazalar.length)];
            const bolge = m.bolge;
            const y = years[Math.floor(rnd() * years.length)];
            const mo = Math.floor(rnd() * 12) + 1;
            const firmId = firmIds[Math.floor(rnd() * firmIds.length)] ?? firmIds[0];
            rows.push({
                firmId,
                year: y,
                month: mo,
                bolge,
                magaza_kodu: m.kod,
                magaza_adi: m.ad,
                sobeler: sobeler[Math.floor(rnd() * sobeler.length)],
                uygunsuzluq_tasnifat: tasnifatlar[Math.floor(rnd() * tasnifatlar.length)],
                say_sobe: 1 + Math.floor(rnd() * 12),
                say_tasnifat: 1 + Math.floor(rnd() * 15),
            });
        }
        return rows;
    }
}

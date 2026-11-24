import { CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { InspectionsService } from '../../inspections/inspections.service';
import { Firm } from '../../inspections/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';

const BOLGELER = ['Bakı', 'Sumqayıt', 'Gəncə', 'Lənkəran', 'Şirvan'];
const MAGAZA_ADLARI = ['Sahil', 'Neftçilər', 'İçərişəhər', 'Xətai', 'Nizami', 'Yasamal', '28 May', 'Binəqədi'];
const SOBELER = ['Ət şöbəsi', 'Süd məhsulları', 'Çörək şöbəsi', 'Meyvə-tərəvəz', 'İçki şöbəsi', 'Baytarlıq'];
const UYG_TASNIFATLAR = ['Saxlanma şərtləri', 'Son istifadə tarixi', 'Etiketləmə', 'Gigiyena', 'Avadanlıq'];
const SUALLAR = [
    'Məhsulların saxlanma temperaturu düzgündürmü?',
    'Son istifadə tarixi keçmiş məhsul varmı?',
    'Etiketlər oxunaqlıdırmı?',
    'İşçilərin gigiyena tələbləri yerinə yetirilirmi?',
    'Avadanlıqların texniki vəziyyəti qənaətbəxşdirmi?',
    'Yanğın söndürücülər müddəti keçməyibmi?',
    'Çıxış yolları açıqdırmı?',
    'Müştəri şikayət jurnalı aparılırmı?',
];

@Component({
    selector: 'app-checklist-analysis',
    standalone: true,
    imports: [
        CommonModule, NgIf, NgFor, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatSelectModule,
        MatTableModule, MatPaginatorModule,
        MatTabsModule, MatMenuModule,
        AuditLoadingOverlayComponent
    ],
    templateUrl: './checklist-analysis.component.html',
    styleUrl: './checklist-analysis.component.scss'
})
export class ChecklistAnalysisComponent implements AfterViewInit {
    @ViewChild('tasnifatPaginator') tasnifatPaginator!: MatPaginator;
    @ViewChild('suallarPaginator') suallarPaginator!: MatPaginator;

    tasnifatColumns = [
        { key: 'row', label: '№' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'magaza_kodu', label: 'Ərazi kodu' },
        { key: 'magaza_adi', label: 'Ərazi adı' },
        { key: 'sobe', label: 'Şöbə' },
        { key: 'uyg_tasnifat', label: 'Çeklist kateqoriyası' },
        { key: 'sobe_uyg_sayi', label: 'Tapıntılar (şöbə üzrə)' },
        { key: 'tasnifat_uyg_sayi', label: 'Tapıntılar (kateqoriya üzrə)' },
    ];
    tasnifatDisplayedColumns = this.tasnifatColumns.map(c => c.key);
    tasnifatDataSource = new MatTableDataSource<any>([]);
    tasnifatCount = 0;

    suallarColumns = [
        { key: 'row', label: '№' },
        { key: 'sual', label: 'Çeklist sualı' },
        { key: 'magaza_kodu', label: 'Ərazi kodu' },
        { key: 'magaza_adi', label: 'Ərazi adı' },
        { key: 'bolge', label: 'Bölgə' },
        { key: 'agirlig_bal', label: 'Çəki balı' },
        { key: 'faktiki_bal', label: 'Faktiki bal' },
        { key: 'faiz_nisbeti', label: 'Faiz nisbəti (%)' },
    ];
    suallarDisplayedColumns = this.suallarColumns.map(c => c.key);
    suallarDataSource = new MatTableDataSource<any>([]);
    suallarCount = 0;

    filtersForm = new FormGroup({
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
    });

    firms: Firm[] = [];

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
    activeTab = 0;

    tasnifatColumnFilters: Record<string, string> = {};
    suallarColumnFilters: Record<string, string> = {};
    get tasnifatFilterColumns(): string[] { return this.tasnifatColumns.map(c => c.key + '__filter'); }
    get suallarFilterColumns(): string[] { return this.suallarColumns.map(c => c.key + '__filter'); }

    constructor(
        private inspectionsService: InspectionsService,
        private notify: NotificationService,
        private fileExport: FileExportService,
    ) {
        this.inspectionsService.getFirms().subscribe({
            next: res => { this.firms = res.data ?? []; },
            error: () => { this.notify.error('Şirkətlər yüklənə bilmədi'); },
        });
    }

    ngAfterViewInit(): void {
        this.tasnifatDataSource.paginator = this.tasnifatPaginator;
        this.suallarDataSource.paginator = this.suallarPaginator;

        const makePredicate = () => (data: any, filter: string) => {
            const filters = JSON.parse(filter || '{}');
            return Object.entries(filters).every(([key, val]) =>
                String(data[key] ?? '').toLowerCase().includes(val as string)
            );
        };
        this.tasnifatDataSource.filterPredicate = makePredicate();
        this.suallarDataSource.filterPredicate = makePredicate();
    }

    applyTasnifatFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
        if (value) { this.tasnifatColumnFilters[key] = value; } else { delete this.tasnifatColumnFilters[key]; }
        this.tasnifatDataSource.filter = JSON.stringify(this.tasnifatColumnFilters);
        if (this.tasnifatDataSource.paginator) { this.tasnifatDataSource.paginator.firstPage(); }
    }

    applySuallarFilter(event: Event, key: string): void {
        const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
        if (value) { this.suallarColumnFilters[key] = value; } else { delete this.suallarColumnFilters[key]; }
        this.suallarDataSource.filter = JSON.stringify(this.suallarColumnFilters);
        if (this.suallarDataSource.paginator) { this.suallarDataSource.paginator.firstPage(); }
    }

    clearTasnifatFilters(): void {
        this.tasnifatColumnFilters = {};
        this.tasnifatDataSource.filter = '';
        document.querySelectorAll<HTMLInputElement>('.tasnifat-filter-input').forEach(i => i.value = '');
    }

    clearSuallarFilters(): void {
        this.suallarColumnFilters = {};
        this.suallarDataSource.filter = '';
        document.querySelectorAll<HTMLInputElement>('.suallar-filter-input').forEach(i => i.value = '');
    }

    onSearch(): void {
        this.isLoading = true;
        setTimeout(() => {
            const selectedFirmId = this.filtersForm.value.firmId;
            const tasnifatRows = Array.from({ length: 25 }, (_, i) => ({
                row: i + 1,
                firmId: this.firmIdForRow(i),
                bolge: BOLGELER[i % BOLGELER.length],
                magaza_kodu: `M${1000 + i}`,
                magaza_adi: MAGAZA_ADLARI[i % MAGAZA_ADLARI.length],
                sobe: SOBELER[i % SOBELER.length],
                uyg_tasnifat: UYG_TASNIFATLAR[i % UYG_TASNIFATLAR.length],
                sobe_uyg_sayi: Math.floor(Math.random() * 10) + 1,
                tasnifat_uyg_sayi: Math.floor(Math.random() * 20) + 1,
            }))
                .filter(r => selectedFirmId == null || r.firmId === selectedFirmId)
                .map((row, idx) => ({ ...row, row: idx + 1 }));
            this.tasnifatDataSource.data = tasnifatRows;
            this.tasnifatColumnFilters = {};
            this.tasnifatDataSource.filter = '';
            this.tasnifatCount = tasnifatRows.length;

            const suallarRows = Array.from({ length: SUALLAR.length * 3 }, (_, i) => {
                const agirlig = Math.floor(Math.random() * 10) + 5;
                const faktiki = Math.floor(Math.random() * agirlig);
                return {
                    row: i + 1,
                    firmId: this.firmIdForRow(i),
                    sual: SUALLAR[i % SUALLAR.length],
                    magaza_kodu: `M${1000 + i}`,
                    magaza_adi: MAGAZA_ADLARI[i % MAGAZA_ADLARI.length],
                    bolge: BOLGELER[i % BOLGELER.length],
                    agirlig_bal: agirlig,
                    faktiki_bal: faktiki,
                    faiz_nisbeti: ((faktiki / agirlig) * 100).toFixed(1),
                };
            })
                .filter(r => selectedFirmId == null || r.firmId === selectedFirmId)
                .map((row, idx) => ({ ...row, row: idx + 1 }));
            this.suallarDataSource.data = suallarRows;
            this.suallarColumnFilters = {};
            this.suallarDataSource.filter = '';
            this.suallarCount = suallarRows.length;

            this.isLoading = false;
        }, 500);
    }

    private firmIdForRow(i: number): number | undefined {
        if (!this.firms.length) { return undefined; }
        return this.firms[i % this.firms.length].id;
    }

    getTotalFindings(): number {
        return this.tasnifatDataSource.data.reduce((s, r) => s + (r.sobe_uyg_sayi ?? 0), 0);
    }

    getAvgFaiz(): string {
        const data = this.suallarDataSource.data;
        if (!data.length) return '0';
        return (data.reduce((s, r) => s + parseFloat(r.faiz_nisbeti), 0) / data.length).toFixed(1);
    }

    exportExcel(tab: 'tasnifat' | 'suallar'): void {
        const data = tab === 'tasnifat'
            ? this.tasnifatDataSource.data.map((r: any) => ({
                '№': r.row, 'Bölgə': r.bolge, 'Ərazi kodu': r.magaza_kodu, 'Ərazi adı': r.magaza_adi,
                'Şöbə': r.sobe, 'Çeklist kateqoriyası': r.uyg_tasnifat,
                'Tapıntılar (şöbə üzrə)': r.sobe_uyg_sayi, 'Tapıntılar (kateqoriya üzrə)': r.tasnifat_uyg_sayi,
            }))
            : this.suallarDataSource.data.map((r: any) => ({
                '№': r.row, 'Çeklist sualı': r.sual, 'Ərazi kodu': r.magaza_kodu, 'Ərazi adı': r.magaza_adi,
                'Bölgə': r.bolge, 'Çəki balı': r.agirlig_bal, 'Faktiki bal': r.faktiki_bal, 'Faiz nisbəti (%)': r.faiz_nisbeti,
            }));
        const suffix = tab === 'tasnifat' ? 'kateqoriya' : 'sual';
        void this.fileExport.exportRowsToExcel(
            data,
            tab === 'tasnifat' ? 'Kateqoriya üzrə' : 'Sual üzrə',
            datedFileName(`ceklist-tehlili-${suffix}`, 'xlsx'),
        );
    }

    exportPdf(tab: 'tasnifat' | 'suallar'): void {
        const isTasnifat = tab === 'tasnifat';
        const headers = isTasnifat
            ? ['№', 'Bölgə', 'Ərazi kodu', 'Ərazi adı', 'Şöbə', 'Çeklist kateqoriyası', 'Tapıntılar (şöbə üzrə)', 'Tapıntılar (kateqoriya üzrə)']
            : ['№', 'Çeklist sualı', 'Ərazi kodu', 'Ərazi adı', 'Bölgə', 'Çəki balı', 'Faktiki bal', 'Faiz nisbəti (%)'];
        const rows = isTasnifat
            ? this.tasnifatDataSource.data.map((r: any) => [r.row, r.bolge, r.magaza_kodu, r.magaza_adi, r.sobe, r.uyg_tasnifat, r.sobe_uyg_sayi, r.tasnifat_uyg_sayi])
            : this.suallarDataSource.data.map((r: any) => [r.row, r.sual, r.magaza_kodu, r.magaza_adi, r.bolge, r.agirlig_bal, r.faktiki_bal, r.faiz_nisbeti]);
        const docDef: any = {
            pageOrientation: 'landscape',
            content: [{ table: { headerRows: 1, body: [headers.map(h => ({ text: h, style: 'th' })), ...rows] }, layout: 'lightHorizontalLines' }],
            styles: { th: { bold: true, color: '#fff', fillColor: '#C62828', fontSize: 8 } },
            defaultStyle: { fontSize: 8 }
        };
        const pdfSuffix = tab === 'tasnifat' ? 'kateqoriya' : 'sual';
        void this.fileExport.exportPdf(docDef, datedFileName(`ceklist-tehlili-${pdfSuffix}`, 'pdf'));
    }
}

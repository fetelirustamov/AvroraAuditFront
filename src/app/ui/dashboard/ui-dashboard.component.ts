import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DashboardChartsService } from '../../admin/pages/dashboard/dashboard-charts.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { AuditLoadingOverlayComponent } from '../components/audit-loading-overlay/audit-loading-overlay.component';

@Component({
    selector: 'app-ui-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatTooltipModule,
        MatButtonModule,
        AuditLoadingOverlayComponent
    ],
    templateUrl: './ui-dashboard.component.html',
    styleUrls: ['./ui-dashboard.component.scss']
})
export class UiDashboardComponent implements OnInit, OnDestroy {
    filtersForm!: FormGroup;
    isLoading = false;
    private mutationObserver?: MutationObserver;

    // ── Filter dropdown data ──────────────────────────────────────────────────
    firms = [
        {
            id: 1, name: 'Direktorluq A', regions: [
                { id: 11, name: 'Bölgə 1', stores: [{ id: 111, name: 'Ərazi A' }, { id: 112, name: 'Ərazi B' }] },
                { id: 12, name: 'Bölgə 2', stores: [{ id: 121, name: 'Ərazi C' }, { id: 122, name: 'Ərazi D' }] }
            ]
        },
        {
            id: 2, name: 'Direktorluq B', regions: [
                { id: 21, name: 'Bölgə 3', stores: [{ id: 211, name: 'Ərazi E' }, { id: 212, name: 'Ərazi F' }] }
            ]
        }
    ];

    regions: { id: number; name: string; stores: any[] }[] = [];
    stores: { id: number; name: string }[] = [];

    dateRanges = [
        { id: 'week',    name: 'Bu həftə' },
        { id: 'month',   name: 'Bu ay' },
        { id: 'quarter', name: 'Son 3 ay' },
        { id: 'year',    name: 'Bu il' }
    ];

    riskLevels = [
        { id: 'high',   name: 'Yüksək Risk' },
        { id: 'medium', name: 'Orta Risk' },
        { id: 'low',    name: 'Aşağı Risk' }
    ];

    auditTypes = [
        { id: 'planned',   name: 'Planlı Audit' },
        { id: 'unplanned', name: 'Plansız Audit' },
        { id: 'followup',  name: 'Yoxlama Auditi' }
    ];

    // ── Right-panel insight data ──────────────────────────────────────────────
    insights = {
        topStore:   { name: 'Ərazi A', score: 94, change: '+4%' },
        riskStore:  { name: 'Ərazi C', score: 52, change: '-8%' },
        riskDown:   '12%',
        openIssues: { count: 14, change: '5.5%' }
    };

    sideStats: { label: string; store: string | null; value: string; trend: 'up' | 'down' }[] = [
        { label: 'Ort. Ərazi Balı', store: 'Ərazi A', value: '4.2',  trend: 'up' },
        { label: 'Risk Ərazisi',    store: 'Ərazi C', value: '32',   trend: 'up' },
        { label: 'Açıq Tapıntılar',  store: 'Ərazi D', value: '56',   trend: 'up' },
        { label: 'Ümumi Trend',      store: null,        value: '+5.2%', trend: 'up' }
    ];

    constructor(
        private charts: DashboardChartsService,
        private fb: FormBuilder,
        @Inject(PLATFORM_ID) private platformId: any
    ) { }

    ngOnInit(): void {
        this.filtersForm = this.fb.group({
            dateRange: [null],
            firmId:    [null],
            riskLevel: [null],
            regionId:  [null],
            storeId:   [null],
            auditType: [null]
        });

        // Cascade: firm → regions
        this.filtersForm.get('firmId')?.valueChanges.subscribe((firmId: number | null) => {
            const firm = this.firms.find(f => f.id === firmId) || null;
            this.regions = firm ? firm.regions : [];
            this.stores  = [];
            this.filtersForm.patchValue({ regionId: null, storeId: null }, { emitEvent: false });
            this.loadCharts();
        });

        // Cascade: region → stores
        this.filtersForm.get('regionId')?.valueChanges.subscribe((regionId: number | null) => {
            const region = this.regions.find(r => r.id === regionId) || null;
            this.stores = region ? region.stores : [];
            this.filtersForm.patchValue({ storeId: null }, { emitEvent: false });
            this.loadCharts();
        });

        this.filtersForm.get('storeId')?.valueChanges.subscribe(() => this.loadCharts());
        this.filtersForm.get('dateRange')?.valueChanges.subscribe(() => this.loadCharts());
        this.filtersForm.get('riskLevel')?.valueChanges.subscribe(() => this.loadCharts());
        this.filtersForm.get('auditType')?.valueChanges.subscribe(() => this.loadCharts());

        this.loadCharts();

        if (isPlatformBrowser(this.platformId)) {
            this.mutationObserver = new MutationObserver(() => {
                clearTimeout((this as any).themeUpdateTimeout);
                (this as any).themeUpdateTimeout = setTimeout(() => this.updateCharts(), 200);
            });
            this.mutationObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    }

    ngOnDestroy(): void {
        this.mutationObserver?.disconnect();
        clearTimeout((this as any).themeUpdateTimeout);
        this.charts.destroyAll();
    }

    resetFilters(): void {
        this.filtersForm.patchValue({
            dateRange: null, firmId: null, riskLevel: null,
            regionId: null, storeId: null, auditType: null
        });
        this.regions = [];
        this.stores  = [];
        this.loadCharts();
    }

    hasActiveFilters(): boolean {
        const v = this.filtersForm.value;
        return !!(v.dateRange || v.firmId || v.riskLevel || v.regionId || v.storeId || v.auditType);
    }

    hasNoData(): boolean { return false; }

    onFilterSubmit(): void {
        if (this.filtersForm.valid) this.loadCharts();
    }

    private loadCharts(): void {
        this.isLoading = true;
        setTimeout(() => {
            this.updateCharts();
            this.isLoading = false;
        }, 300);
    }

    private updateCharts(): void {
        const firmId   = this.filtersForm.get('firmId')?.value as number | null;
        const regionId = this.filtersForm.get('regionId')?.value as number | null;
        const storeId  = this.filtersForm.get('storeId')?.value as number | null;

        const selectedStores: string[] = (() => {
            if (storeId) {
                const s = [...this.regions.flatMap(r => r.stores)].find(s => s.id === storeId);
                return s ? [s.name] : [];
            }
            if (regionId) return (this.regions.find(r => r.id === regionId)?.stores || []).map(s => s.name);
            if (firmId)   return (this.firms.find(f => f.id === firmId)?.regions || []).flatMap(r => r.stores.map(s => s.name));
            return ['Ərazi A', 'Ərazi B', 'Ərazi C', 'Ərazi D'];
        })();

        const rnd  = (len: number, lo = 5,  hi = 80)  => Array.from({ length: len }, () => Math.floor(lo + Math.random() * (hi - lo)));
        const rndS = (len: number) => Array.from({ length: len }, () => Math.floor(60 + Math.random() * 35));

        this.charts.destroyAll();

        // Bar: 4 series (Ümumi, Uyğun, Uyğunsuz, Yoxlanır)
        this.charts.loadPlansByStore(
            [
                { name: 'Ümumi',     data: rnd(selectedStores.length, 60, 150) },
                { name: 'Uyğun',     data: rndS(selectedStores.length) },
                { name: 'Uyğunsuz', data: rnd(selectedStores.length, 5, 30) },
                { name: 'Yoxlanır', data: rnd(selectedStores.length, 3, 20) }
            ],
            selectedStores
        );

        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];
        this.charts.loadPlanTrend(
            [
                { name: 'Tapıntılar', data: rnd(months.length, 50, 180) },
                { name: 'Yekun Bal',  data: rndS(months.length) }
            ],
            months
        );

        this.charts.loadPlanStatus(
            [45, 28, 15, 8, 4],
            ['Tamamlanan', 'Yoxlanır', 'Gecikmiş', 'Uyğunsuz', 'Ləğv olunmuş']
        );

        const depts = ['Kassa', 'SAT', 'Anbar', 'Təmizlik'];
        this.charts.loadDeptNoncompliance(
            [
                { name: 'Uyğun',    data: [12, 14, 11, 15] },
                { name: 'Riskli',   data: [2, 1, 3, 1] },
                { name: 'Uyğunsuz', data: [6, 3, 4, 2] }
            ],
            depts
        );

        this.charts.loadStoreDeptHeatmap([
            { name: 'Ərazi A', data: depts.map((d, i) => ({ x: d, y: [2, 9, 5, 11][i] })) },
            { name: 'Ərazi B', data: depts.map((d, i) => ({ x: d, y: [4, 11, 7, 0][i] })) },
            { name: 'Ərazi C', data: depts.map((d, i) => ({ x: d, y: [12, 7, 2, 9][i] })) },
            { name: 'Ərazi D', data: depts.map((d, i) => ({ x: d, y: [1, 4, 9, 2][i] })) },
            { name: 'Ərazi E', data: depts.map((d, i) => ({ x: d, y: [9, 1, 5, 10][i] })) }
        ]);
    }
}

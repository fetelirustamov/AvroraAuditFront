import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { LocationService } from '../../admin/services/location.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ListStateComponent } from '../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../shared/utils/query-state';
import { AuditLoadingOverlayComponent } from '../components/audit-loading-overlay/audit-loading-overlay.component';
import { Firm } from '../inspections/firm.model';
import { InspectionsService } from '../inspections/inspections.service';
import { DashboardVisualsService } from './dashboard-visuals.service';
import {
    DashboardLocation,
    DashboardOverview,
    MONTH_SHORT_LABELS
} from './dashboard.model';
import { DashboardService } from './dashboard.service';
import { COMPLIANCE_FAIR, COMPLIANCE_GOOD, complianceTone } from '../../shared/utils/compliance';
import { planStatusLabel } from '../../shared/status/status-meta';

/** `/locations/regions/{firmId}` cavabındakı bölgə */
interface RegionOption {
    id: number;
    regionName: string;
}

/** `/firms/{firmId}/locations` cavabından filtr üçün lazım olan hissə */
interface LocationOption {
    code: number;
    name: string;
    regionId: number;
}

interface KpiCard {
    key: string;
    label: string;
    hint: string;
    icon: string;
    /** İkon yalnız həddə görə status daşıyanda rənglənir, qalanı neytraldır */
    tone: 'neutral' | 'success' | 'warning' | 'danger';
    value: string;
    /** Əvvəlki dövrdə müqayisə bazası yoxdursa `null` */
    delta: number | null;
    /** Faiz göstəricilərində fərq faiz bəndidir, saylarda nisbi faizdir */
    deltaUnit: '%' | 'b.';
    /** Aşağı düşmək yaxşıdırsa (açıq uyğunsuzluq) yaşıl/qırmızı tərsinə oxunur */
    lowerIsBetter: boolean;
    sparkData: number[];
}

/**
 * Risk matrisindəki zonalar — bubble seriyalarına və cədvəl nişanlarına eyni məntiq.
 * `tone` qrafik rəngini (`chartColors()`), `color` isə DOM-dakı nöqtə/zolaq rəngini verir.
 */
const RISK_ZONES = [
    { key: 'low', name: `Aşağı risk (≥${COMPLIANCE_GOOD}%)`, tone: 'success', color: 'var(--success)', min: COMPLIANCE_GOOD },
    { key: 'medium', name: `Orta risk (${COMPLIANCE_FAIR}–${COMPLIANCE_GOOD}%)`, tone: 'warning', color: 'var(--warning)', min: COMPLIANCE_FAIR },
    { key: 'high', name: 'Yüksək risk (<70%)', tone: 'danger', color: 'var(--danger)', min: 0 }
] as const;

/** Radar və istilik xəritəsi oxunaqlı qalsın deyə şöbə sayı məhdudlaşdırılır */
const MAX_SECTIONS = 8;

/** Bundan az oxda radar şaquli xəttə çevrilir — əvəzinə müqayisə sütunları çəkilir */
const MIN_RADAR_AXES = 3;

@Component({
    selector: 'app-ui-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatTooltipModule,
        MatProgressBarModule,
        AuditLoadingOverlayComponent,
        PageHeaderComponent,
        ListStateComponent
    ],
    providers: [DashboardVisualsService],
    templateUrl: './ui-dashboard.component.html',
    styleUrls: ['./ui-dashboard.component.scss']
})
export class UiDashboardComponent implements OnInit, OnDestroy {
    // ── Filtrlər ─────────────────────────────────────────────────────────────
    readonly filtersForm = new FormGroup({
        year: new FormControl<number | null>(new Date().getFullYear()),
        month: new FormControl<number | null>(null),
        firmId: new FormControl<number | null>(null),
        regionId: new FormControl<number | null>(null),
        locationCode: new FormControl<number | null>(null)
    });

    readonly years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    readonly months = [
        { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' },
        { value: 3, label: 'Mart' }, { value: 4, label: 'Aprel' },
        { value: 5, label: 'May' }, { value: 6, label: 'İyun' },
        { value: 7, label: 'İyul' }, { value: 8, label: 'Avqust' },
        { value: 9, label: 'Sentyabr' }, { value: 10, label: 'Oktyabr' },
        { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' }
    ];

    firms: Firm[] = [];
    regions: RegionOption[] = [];
    private allLocations: LocationOption[] = [];
    locations: LocationOption[] = [];

    // ── Məzmun ───────────────────────────────────────────────────────────────
    isLoading = false;
    hasLoaded = false;
    overview: DashboardOverview | null = null;
    /** Sorğu uğursuz olanda istifadəçiyə göstərilən mesaj; boş vəziyyətdən ayrıdır */
    loadError: string | null = null;

    kpis: KpiCard[] = [];
    ranking: DashboardLocation[] = [];
    /** Cədvəl «ən yaxşı» yoxsa «ən riskli» əraziləri göstərir */
    rankingMode: 'best' | 'risk' = 'risk';

    readonly riskZones = RISK_ZONES;

    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly visuals: DashboardVisualsService,
        private readonly inspectionsService: InspectionsService,
        private readonly locationService: LocationService,
        private readonly notify: NotificationService,
        private readonly cdr: ChangeDetectorRef,
        private readonly router: Router,
        private readonly route: ActivatedRoute
    ) { }

    // ── Həyat dövrü ──────────────────────────────────────────────────────────

    ngOnInit(): void {
        this.loadFirms();

        this.filtersForm.get('firmId')!.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(firmId => this.onFirmChange(firmId));

        this.filtersForm.get('regionId')!.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(regionId => this.onRegionChange(regionId));

        this.restoreFilters();
        this.loadOverview();
    }

    /** Filtrlər URL-dədir: səhifə yenilənəndə və link paylaşılanda eyni görünüş açılır */
    private restoreFilters(): void {
        const q = this.route.snapshot.queryParamMap;
        this.filtersForm.patchValue({
            year: queryNumber(q, 'year') ?? new Date().getFullYear(),
            month: queryNumber(q, 'month'),
        });
        const firmId = queryNumber(q, 'firm');
        if (firmId == null) { return; }
        // Firma dəyişəndə bölgə/mağaza siyahıları yüklənir və sıfırlanır: dəyərlər ondan sonra qoyulur
        this.filtersForm.controls.firmId.setValue(firmId);
        this.filtersForm.patchValue({
            regionId: queryNumber(q, 'region'),
            locationCode: queryNumber(q, 'location')
        }, { emitEvent: false });
    }

    private writeFilters(): void {
        const { year, month, firmId, regionId, locationCode } = this.filtersForm.getRawValue();
        void writeQueryState(this.router, {
            year: year === new Date().getFullYear() ? null : year,
            month,
            firm: firmId,
            region: regionId,
            location: locationCode
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.visuals.destroyAll();
    }

    // ── Filtr məlumatları ────────────────────────────────────────────────────

    private loadFirms(): void {
        this.inspectionsService.getFirms()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => { this.firms = res?.data ?? []; },
                error: () => {
                    this.firms = [];
                    this.notify.error('Firma siyahısı yüklənmədi');
                }
            });
    }

    private onFirmChange(firmId: number | null): void {
        this.regions = [];
        this.allLocations = [];
        this.locations = [];
        this.filtersForm.patchValue({ regionId: null, locationCode: null }, { emitEvent: false });

        if (!firmId) { return; }

        this.locationService.getRegionsByFirmId(firmId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => { this.regions = this.readList<RegionOption>(res); },
                error: () => {
                    this.regions = [];
                    this.notify.error('Bölgə siyahısı yüklənmədi');
                }
            });

        this.inspectionsService.getLocationByFirmId(firmId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.allLocations = this.readList<any>(res).map(l => ({
                        code: Number(l.locationCode),
                        name: l.locationName ?? '',
                        regionId: Number(l.regionID ?? l.regionId ?? 0)
                    }));
                    this.locations = this.allLocations;
                },
                error: () => {
                    this.allLocations = [];
                    this.locations = [];
                    this.notify.error('Mağaza siyahısı yüklənmədi');
                }
            });
    }

    private onRegionChange(regionId: number | null): void {
        this.filtersForm.patchValue({ locationCode: null }, { emitEvent: false });
        this.locations = regionId
            ? this.allLocations.filter(l => l.regionId === regionId)
            : this.allLocations;
    }

    /** API cavabları `{ data: [...] }` və ya birbaşa massiv qaytara bilir */
    private readList<T>(res: any): T[] {
        if (Array.isArray(res?.data)) { return res.data as T[]; }
        if (Array.isArray(res)) { return res as T[]; }
        return [];
    }

    // ── Filtr əməliyyatları ──────────────────────────────────────────────────

    get hasActiveFilters(): boolean {
        const { month, firmId, regionId, locationCode } = this.filtersForm.value;
        return month != null || firmId != null || regionId != null || locationCode != null;
    }

    onSearch(): void {
        this.writeFilters();
        this.loadOverview();
    }

    clearFilters(): void {
        this.filtersForm.reset({
            year: new Date().getFullYear(),
            month: null,
            firmId: null,
            regionId: null,
            locationCode: null
        });
        this.writeFilters();
        this.loadOverview();
    }

    setRankingMode(mode: 'best' | 'risk'): void {
        this.rankingMode = mode;
        this.ranking = this.buildRanking();
    }

    // ── Məlumatın yüklənməsi ─────────────────────────────────────────────────

    /** Yenidən yükləmədə köhnə göstəricilər yerində qalır, üstündə nazik xətt görünür */
    loadOverview(): void {
        const { year, month, firmId, regionId, locationCode } = this.filtersForm.getRawValue();

        this.isLoading = true;
        this.loadError = null;

        this.dashboardService.getOverview({
            year: year ?? new Date().getFullYear(),
            month: month ?? null,
            firmId: firmId ?? null,
            regionId: regionId ?? null,
            locationCode: locationCode ?? null
        })
            .pipe(takeUntil(this.destroy$), finalize(() => { this.isLoading = false; }))
            .subscribe({
                next: res => {
                    this.overview = res?.data ?? null;
                    this.hasLoaded = true;
                    this.applyOverview();
                },
                error: error => {
                    this.visuals.destroyAll();
                    this.overview = null;
                    this.hasLoaded = true;
                    this.kpis = [];
                    this.ranking = [];
                    this.loadError = apiErrorMessage(error, 'Əsas səhifənin məlumatları yüklənmədi');
                }
            });
    }

    private applyOverview(): void {
        this.visuals.destroyAll();
        if (!this.overview) { return; }

        this.kpis = this.buildKpis();
        this.ranking = this.buildRanking();

        // Qrafiklər DOM-a bağlanır, ona görə əvvəlcə şablon yenilənməlidir
        this.cdr.detectChanges();

        if (this.isEmpty) { return; }
        void this.renderVisuals();
    }

    get isEmpty(): boolean {
        return !this.overview || this.overview.kpi.totalInspections === 0;
    }

    // ── KPI kartları ─────────────────────────────────────────────────────────

    private buildKpis(): KpiCard[] {
        const kpi = this.overview!.kpi;
        const trend = this.overview!.monthlyTrend;

        return [
            {
                key: 'inspections',
                label: 'Ümumi yoxlama',
                hint: `${kpi.plannedInspections} planlı · ${kpi.unplannedInspections} plansız`,
                icon: 'fact_check',
                tone: 'neutral',
                value: String(kpi.totalInspections),
                delta: kpi.totalInspectionsDelta,
                deltaUnit: '%',
                lowerIsBetter: false,
                sparkData: trend.map(m => m.inspections)
            },
            {
                key: 'completion',
                label: 'Tamamlanma',
                hint: `${kpi.completedInspections} yekunlaşmış yoxlama`,
                icon: 'task_alt',
                tone: 'neutral',
                value: `${kpi.completionRate}%`,
                delta: kpi.completionRateDelta,
                deltaUnit: 'b.',
                lowerIsBetter: false,
                sparkData: trend.map(m => m.completed)
            },
            {
                key: 'findings',
                label: 'Uyğunsuzluq',
                hint: `${kpi.totalFindings} ümumi · ${kpi.openFindings} açıq`,
                icon: 'report_problem',
                tone: 'neutral',
                value: String(kpi.openFindings),
                delta: kpi.openFindingsDelta,
                deltaUnit: '%',
                lowerIsBetter: true,
                sparkData: trend.map(m => m.findings)
            },
            {
                key: 'compliance',
                label: 'Orta uyğunluq',
                hint: 'Toplanan balın normativə nisbəti',
                icon: 'trending_up',
                // Yeganə həddə bağlı göstərici: rəng uyğunluq zonasından gəlir
                tone: complianceTone(kpi.averageCompliance),
                value: `${kpi.averageCompliance}%`,
                delta: kpi.averageComplianceDelta,
                deltaUnit: 'b.',
                lowerIsBetter: false,
                sparkData: trend.map(m => m.compliance)
            }
        ];
    }

    // ── Ərazi reytinqi ───────────────────────────────────────────────────────

    private buildRanking(): DashboardLocation[] {
        const locations = this.overview?.locations ?? [];
        const sorted = [...locations].sort((a, b) =>
            this.rankingMode === 'best' ? b.compliance - a.compliance : a.compliance - b.compliance);
        return sorted.slice(0, 10);
    }

    riskZoneOf(compliance: number): { key: string; name: string; color: string } {
        return RISK_ZONES.find(z => compliance >= z.min) ?? RISK_ZONES[RISK_ZONES.length - 1];
    }

    scoreTone(compliance: number): 'is-success' | 'is-warning' | 'is-danger' {
        return `is-${complianceTone(compliance)}`;
    }

    // ── Qrafiklər ────────────────────────────────────────────────────────────

    private async renderVisuals(): Promise<void> {
        const data = this.overview!;

        await this.visuals.renderComplianceGauge('dash_gauge', data.kpi.averageCompliance);

        for (const kpi of this.kpis) {
            await this.visuals.renderSparkline(`dash_spark_${kpi.key}`, kpi.sparkData);
        }

        await this.visuals.renderTrend(
            'dash_trend',
            data.monthlyTrend.map(m => m.inspections),
            data.monthlyTrend.map(m => m.findings),
            data.monthlyTrend.map(m => m.compliance)
        );

        const sections = this.topSections();
        if (sections.length) {
            const names = sections.map(s => s.sectionName);
            const current = sections.map(s => s.compliance);
            const previous = sections.map(s => s.previousCompliance);

            // Radar 3 oxdan az olanda şaquli xəttə çevrilir — o halda sütunlar
            if (sections.length >= MIN_RADAR_AXES) {
                await this.visuals.renderSectionRadar('dash_radar', names, current, previous);
            } else {
                await this.visuals.renderSectionBars('dash_radar', names, current, previous);
            }
        }

        if (data.categoryShare.length) {
            await this.visuals.renderCategoryTreemap(
                'dash_treemap',
                data.categoryShare.map(c => ({ name: c.categoryName, value: c.findings }))
            );
        }

        const heatSeries = this.buildHeatSeries();
        if (heatSeries.length) {
            await this.visuals.renderSectionHeatmap('dash_heatmap', heatSeries);
        }

        const riskSeries = this.buildRiskSeries();
        if (riskSeries.length) {
            await this.visuals.renderRiskMatrix('dash_risk', riskSeries);
        }

        const funnel = this.buildFunnel();
        if (funnel.labels.length) {
            await this.visuals.renderStatusFunnel('dash_funnel', funnel.labels, funnel.values);
        }
    }

    /** Radar üçün ən çox uyğunsuzluğu olan şöbələr — çox ox oxunaqlılığı pozur */
    private topSections() {
        return [...(this.overview?.sectionCompliance ?? [])]
            .sort((a, b) => b.findings - a.findings)
            .slice(0, MAX_SECTIONS);
    }

    /** İstilik xəritəsi: şöbə sətirləri × 12 ay sütunu */
    private buildHeatSeries(): { name: string; data: { x: string; y: number }[] }[] {
        const cells = this.overview?.sectionMonthHeat ?? [];
        if (!cells.length) { return []; }

        const totals = new Map<string, number>();
        cells.forEach(c => totals.set(c.sectionName, (totals.get(c.sectionName) ?? 0) + c.findings));

        const sections = [...totals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_SECTIONS)
            .map(([name]) => name);

        return sections.map(name => ({
            name,
            data: MONTH_SHORT_LABELS.map((label, index) => ({
                x: label,
                y: cells.find(c => c.sectionName === name && c.month === index + 1)?.findings ?? 0
            }))
        }));
    }

    /** Risk matrisi: hər ərazi bir kürə, zonaya görə rənglənir */
    private buildRiskSeries() {
        const locations = this.overview?.locations ?? [];
        if (!locations.length) { return []; }

        return RISK_ZONES
            .map(zone => ({
                name: zone.name,
                tone: zone.tone,
                data: locations
                    .filter(l => this.riskZoneOf(l.compliance).key === zone.key)
                    .map(l => ({
                        x: l.inspections,
                        y: l.compliance,
                        // Kürə ölçüsü sıfır olmasın deyə minimum 1
                        z: Math.max(1, l.openFindings),
                        label: `${l.locationCode} — ${l.locationName}`
                    }))
            }))
            .filter(series => series.data.length > 0);
    }

    /** Plan həyat dövrü: status → say, böyükdən kiçiyə (huni görünüşü) */
    private buildFunnel(): { labels: string[]; values: number[] } {
        const steps = [...(this.overview?.statusFunnel ?? [])].sort((a, b) => b.count - a.count);
        return {
            labels: steps.map(s => planStatusLabel(s.status)),
            values: steps.map(s => s.count)
        };
    }

    // ── Şablon köməkçiləri ───────────────────────────────────────────────────

    get periodLabel(): string {
        const period = this.overview?.period;
        if (!period) { return ''; }
        return period.month
            ? `${this.months.find(m => m.value === period.month)?.label} ${period.year}`
            : `${period.year}-cı il`;
    }

    /** Müsbət dəyişmə həmişə yaxşı deyil — açıq uyğunsuzluqda əksinədir */
    isGoodDelta(kpi: KpiCard): boolean {
        if (kpi.delta === null || kpi.delta === 0) { return false; }
        return kpi.lowerIsBetter ? kpi.delta < 0 : kpi.delta > 0;
    }

    isBadDelta(kpi: KpiCard): boolean {
        if (kpi.delta === null || kpi.delta === 0) { return false; }
        return !this.isGoodDelta(kpi);
    }

    trackByKpi(_: number, kpi: KpiCard): string { return kpi.key; }
    trackByLocation(_: number, row: DashboardLocation): number { return row.locationCode; }
}

import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { LocationService } from '../../../admin/services/location.service';
import { SectionService } from '../../../admin/services/section.service';
import { UserService } from '../../../admin/services/user.service';
import { TableState } from '../../../models/table-state.model';
import { FileExportService, datedFileName } from '../../../shared/services/file-export.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { levelRoleLabel } from '../../../shared/utils/approval-level';
import { BAKU_TZ, parseApiUtcDate } from '../../../shared/utils/date.util';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../../plans/plan.service';
import { DisruptionService } from '../disruption.service';
import {
    DisruptionStageCount, DisruptionTrackingItem, STAGE_OPTIONS, StageCode, TrackState,
    currentHolder, stageMeta, stageTrack,
} from './disruption-tracking.model';
import { DisruptionCategoryOption, DisruptionTrackingService } from './disruption-tracking.service';
import { TrackingDetailPanelComponent } from './tracking-detail-panel/tracking-detail-panel.component';

interface Option { value: number; label: string; }
interface LocationOption extends Option { regionId: number; }

type KpiKey = 'all' | 'inspector' | 'chain' | 'overdue' | 'closed';

/** KPI kartına klik edəndə filtrə qoyulan mərhələlər */
const KPI_STAGES: Record<KpiKey, StageCode[]> = {
    all: [],
    inspector: ['INSPECTOR', 'HEAD_INSPECTOR'],
    chain: ['STORE_ANSWER', 'CHAIN_APPROVAL', 'RETURNED'],
    overdue: [],
    closed: ['CLOSED'],
};

/** mat-select minlərlə option render edəndə donur — axtarışlı siyahılar bu sayda kəsilir */
const OPTION_RENDER_LIMIT = 150;

/** Seçimləri firmadan yüklənən filtrlər — firma seçilməyəndə deaktivdir */
const FIRM_DEPENDENT = ['regionId', 'locationCode', 'inspectorId', 'approverUserCode', 'categoryId', 'sectionId'] as const;

@Component({
    selector: 'app-disruption-tracking',
    standalone: true,
    imports: [
        DatePipe, ReactiveFormsModule, FormsModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
        MatCheckboxModule, MatTableModule, MatSortModule, MatPaginatorModule,
        AuditLoadingOverlayComponent, TrackingDetailPanelComponent,
    ],
    providers: [DatePipe],
    templateUrl: './disruption-tracking.component.html',
    styleUrl: './disruption-tracking.component.scss',
})
export class DisruptionTrackingComponent implements OnInit {
    @ViewChild(MatPaginator) paginator?: MatPaginator;

    private readonly destroyRef = inject(DestroyRef);
    private readonly trackingService = inject(DisruptionTrackingService);
    private readonly inspectionsService = inject(InspectionsService);
    private readonly locationService = inject(LocationService);
    private readonly planService = inject(PlanService);
    private readonly userService = inject(UserService);
    private readonly sectionService = inject(SectionService);
    private readonly disruptionService = inject(DisruptionService);
    private readonly fileExport = inject(FileExportService);
    private readonly notify = inject(NotificationService);
    private readonly datePipe = inject(DatePipe);

    readonly tz = BAKU_TZ;
    readonly stageMeta = stageMeta;
    readonly stageOptions = STAGE_OPTIONS;
    readonly levelOptions = [1, 2, 3].map(l => ({ value: l, label: `${l}-ci təsdiq · ${levelRoleLabel(l)}` }));
    readonly displayedColumns = ['disruptionId', 'location', 'reason', 'stage', 'holder', 'track', 'createdDate', 'deadlineDate', 'open'];

    readonly filtersForm = new FormGroup({
        firmId: new FormControl<number | null>(null),
        regionId: new FormControl<number | null>(null),
        locationCode: new FormControl<number | null>(null),
        stages: new FormControl<StageCode[]>([], { nonNullable: true }),
        dateRange: new FormGroup({
            start: new FormControl<Date | null>(null),
            end: new FormControl<Date | null>(null),
        }),
        search: new FormControl<string>('', { nonNullable: true }),
        inspectorId: new FormControl<number | null>(null),
        approverUserCode: new FormControl<number | null>(null),
        level: new FormControl<number | null>(null),
        categoryId: new FormControl<number | null>(null),
        reasonId: new FormControl<number | null>(null),
        sectionId: new FormControl<number | null>(null),
        overdueOnly: new FormControl<boolean>(false, { nonNullable: true }),
    });

    showAdvanced = false;

    firms: Firm[] = [];
    regions: Option[] = [];
    private allLocations: LocationOption[] = [];
    inspectors: Option[] = [];
    approvers: Option[] = [];
    categories: Option[] = [];
    reasons: Option[] = [];
    sections: Option[] = [];

    locationQuery = '';
    inspectorQuery = '';
    approverQuery = '';

    readonly tableState = new TableState();
    rows: DisruptionTrackingItem[] = [];
    total = 0;
    private stageCounts: DisruptionStageCount[] = [];
    activeKpi: KpiKey = 'all';

    isLoading = false;
    isExporting = false;
    selectedId: number | null = null;

    ngOnInit(): void {
        this.tableState.paginator.page = 0;
        this.tableState.paginator.size = 25;
        this.tableState.sorting.column = 'createdDate';
        this.tableState.sorting.direction = 'desc';

        this.setFirmDependentEnabled(false);
        this.filtersForm.controls.reasonId.disable({ emitEvent: false });
        this.watchCascades();
        this.inspectionsService.getFirms()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.firms = res?.data ?? [];
                    if (this.firms.length === 1) {
                        this.filtersForm.controls.firmId.setValue(this.firms[0].id);
                    }
                    this.search();
                },
                error: () => {
                    this.notify.error('Firma siyahısı yüklənmədi');
                    this.search();
                },
            });
    }

    // ── Kaskad filtrlər ──────────────────────────────────────────────────────

    private watchCascades(): void {
        const c = this.filtersForm.controls;
        c.firmId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => this.onFirmChange(id));
        c.regionId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            c.locationCode.setValue(null, { emitEvent: false });
        });
        c.categoryId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => this.onCategoryChange(id));
    }

    private onFirmChange(firmId: number | null): void {
        this.filtersForm.patchValue(
            { regionId: null, locationCode: null, inspectorId: null, approverUserCode: null, categoryId: null, reasonId: null, sectionId: null },
            { emitEvent: false },
        );
        this.regions = [];
        this.allLocations = [];
        this.inspectors = [];
        this.approvers = [];
        this.categories = [];
        this.reasons = [];
        this.sections = [];
        this.filtersForm.controls.reasonId.disable({ emitEvent: false });
        this.setFirmDependentEnabled(firmId != null);
        if (!firmId) { return; }

        const fail = (what: string) => () => this.notify.error(`${what} siyahısı yüklənmədi`);
        const keep = takeUntilDestroyed<any>(this.destroyRef);

        this.locationService.getRegionsByFirmId(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                this.regions = readList<any>(res).map(r => ({ value: Number(r.id), label: r.regionName ?? '' }));
            },
            error: fail('Region'),
        });
        this.inspectionsService.getLocationByFirmId(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                // Locations.LocationCode API-dən string gəlir — müqayisə üçün rəqəmə çevrilir
                this.allLocations = readList<any>(res).map(l => ({
                    value: Number(l.locationCode),
                    label: `${l.locationCode} — ${l.locationName ?? ''}`,
                    regionId: Number(l.regionID ?? l.regionId ?? 0),
                }));
            },
            error: fail('Mağaza'),
        });
        this.planService.getInspectors(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                this.inspectors = readList<any>(res).map(u => ({ value: Number(u.userCode), label: fullName(u) }));
            },
            error: fail('Müfəttiş'),
        });
        this.userService.getUsersByFirm(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                this.approvers = readList<any>(res)
                    .filter(u => u.userCode != null)
                    .map(u => ({ value: Number(u.userCode), label: fullName(u) }));
            },
            error: fail('İstifadəçi'),
        });
        this.trackingService.categoriesByFirm(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                this.categories = readList<DisruptionCategoryOption>(res).map(cat => ({ value: cat.id, label: cat.categoryName }));
            },
            error: fail('Kateqoriya'),
        });
        this.sectionService.getByFirmId(firmId).pipe(keep).subscribe({
            next: (res: any) => {
                this.sections = readList<any>(res).map(s => ({ value: Number(s.id), label: s.sectionName ?? '' }));
            },
            error: fail('Şöbə'),
        });
    }

    private setFirmDependentEnabled(enabled: boolean): void {
        FIRM_DEPENDENT.forEach(key => {
            const control = this.filtersForm.controls[key];
            if (enabled) { control.enable({ emitEvent: false }); } else { control.disable({ emitEvent: false }); }
        });
    }

    private onCategoryChange(categoryId: number | null): void {
        const reasonControl = this.filtersForm.controls.reasonId;
        reasonControl.setValue(null, { emitEvent: false });
        reasonControl.disable({ emitEvent: false });
        this.reasons = [];
        if (!categoryId) { return; }
        this.disruptionService.getReasonsByCategory(categoryId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.reasons = readList<any>(res).map(r => ({ value: Number(r.id), label: r.reasonName ?? '' }));
                    if (this.reasons.length) { reasonControl.enable({ emitEvent: false }); }
                },
                error: () => this.notify.error('Səbəb siyahısı yüklənmədi'),
            });
    }

    get filteredLocations(): Option[] {
        const regionId = this.filtersForm.controls.regionId.value;
        const scoped = regionId ? this.allLocations.filter(l => l.regionId === regionId) : this.allLocations;
        return limitByQuery(scoped, this.locationQuery, this.filtersForm.controls.locationCode.value);
    }

    get filteredInspectors(): Option[] {
        return limitByQuery(this.inspectors, this.inspectorQuery, this.filtersForm.controls.inspectorId.value);
    }

    get filteredApprovers(): Option[] {
        return limitByQuery(this.approvers, this.approverQuery, this.filtersForm.controls.approverUserCode.value);
    }

    get hasFirm(): boolean {
        return this.filtersForm.controls.firmId.value != null;
    }

    /** Ətraflı paneldə seçilmiş filtr sayı — bağlı olanda düymədə göstərilir */
    get advancedCount(): number {
        const v = this.filtersForm.getRawValue();
        return [v.inspectorId, v.approverUserCode, v.level, v.categoryId, v.reasonId, v.sectionId]
            .filter(x => x != null).length + (v.overdueOnly ? 1 : 0);
    }

    // ── KPI ─────────────────────────────────────────────────────────────────

    private countOf(stages: StageCode[]): number {
        return this.stageCounts.filter(s => stages.includes(s.stageCode)).reduce((sum, s) => sum + s.total, 0);
    }

    get kpis(): { key: KpiKey; label: string; icon: string; value: number }[] {
        const all = this.stageCounts.reduce((sum, s) => sum + s.total, 0);
        const overdue = this.stageCounts.reduce((sum, s) => sum + s.overdue, 0);
        return [
            { key: 'all', label: 'Cəmi uyğunsuzluq', icon: 'list_alt', value: all },
            { key: 'inspector', label: 'Müfəttiş tərəfində', icon: 'person_search', value: this.countOf(KPI_STAGES.inspector) },
            { key: 'chain', label: 'Mağaza zəncirində', icon: 'account_tree', value: this.countOf(KPI_STAGES.chain) },
            { key: 'overdue', label: 'Son tarixi keçib', icon: 'schedule', value: overdue },
            { key: 'closed', label: 'Bağlanıb', icon: 'task_alt', value: this.countOf(KPI_STAGES.closed) },
        ];
    }

    selectKpi(key: KpiKey): void {
        this.activeKpi = key;
        this.filtersForm.patchValue({ stages: KPI_STAGES[key], overdueOnly: key === 'overdue' }, { emitEvent: false });
        if (key === 'overdue') { this.showAdvanced = true; }
        this.search();
    }

    // ── Axtarış, səhifələmə, sıralama ───────────────────────────────────────

    onSubmit(): void {
        this.activeKpi = this.resolveKpi();
        this.search();
    }

    /** Form əl ilə dəyişdiriləndə vurğulanan KPI formun vəziyyətinə uyğunlaşdırılır */
    private resolveKpi(): KpiKey {
        const { stages, overdueOnly } = this.filtersForm.getRawValue();
        if (overdueOnly) { return stages.length ? 'all' : 'overdue'; }
        const key = (Object.keys(KPI_STAGES) as KpiKey[]).find(k =>
            k !== 'overdue' && KPI_STAGES[k].length === stages.length && KPI_STAGES[k].every(s => stages.includes(s)));
        return key ?? 'all';
    }

    clearFilters(): void {
        const firmId = this.firms.length === 1 ? this.firms[0].id : null;
        this.filtersForm.reset({ stages: [], search: '', overdueOnly: false }, { emitEvent: false });
        this.filtersForm.controls.firmId.setValue(firmId);
        this.locationQuery = this.inspectorQuery = this.approverQuery = '';
        this.activeKpi = 'all';
        this.search();
    }

    search(): void {
        this.tableState.paginator.page = 0;
        this.paginator?.firstPage();
        this.fetch();
    }

    onPage(e: PageEvent): void {
        this.tableState.paginator.page = e.pageIndex;
        this.tableState.paginator.size = e.pageSize;
        this.fetch();
    }

    onSort(sort: Sort): void {
        this.tableState.sorting.column = sort.direction ? sort.active : 'createdDate';
        this.tableState.sorting.direction = sort.direction || 'desc';
        this.search();
    }

    private buildFilter(): Record<string, string> {
        const v = this.filtersForm.getRawValue();
        const f: Record<string, string> = {};
        const put = (key: string, value: number | null) => { if (value != null) { f[key] = String(value); } };

        put('firmId', v.firmId);
        put('regionId', v.regionId);
        put('locationCode', v.locationCode);
        put('inspectorId', v.inspectorId);
        put('approverUserCode', v.approverUserCode);
        put('level', v.level);
        put('categoryId', v.categoryId);
        put('reasonId', v.reasonId);
        put('sectionId', v.sectionId);
        if (v.stages.length) { f['stages'] = v.stages.join(','); }
        if (v.overdueOnly) { f['overdueOnly'] = 'true'; }
        if (v.search.trim()) { f['search'] = v.search.trim(); }
        const start = this.datePipe.transform(v.dateRange.start, 'yyyy-MM-dd');
        const end = this.datePipe.transform(v.dateRange.end, 'yyyy-MM-dd');
        if (start) { f['startDate'] = start; }
        if (end) { f['endDate'] = end; }
        return f;
    }

    private fetch(): void {
        this.tableState.filter = this.buildFilter();
        this.isLoading = true;
        this.trackingService.list(this.tableState)
            .pipe(finalize(() => { this.isLoading = false; }), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.rows = res.data?.items ?? [];
                    this.total = res.data?.total ?? 0;
                    this.stageCounts = res.data?.stages ?? [];
                },
                error: () => {
                    this.rows = [];
                    this.total = 0;
                    this.stageCounts = [];
                    this.notify.error('Uyğunsuzluqlar yüklənmədi', { message: 'İnternet bağlantısını və ya icazəni yoxlayın.' });
                },
            });
    }

    // ── Cədvəl köməkçiləri ──────────────────────────────────────────────────

    date(value: string | null | undefined): string | null {
        return parseApiUtcDate(value);
    }

    holder(row: DisruptionTrackingItem) {
        return currentHolder(row);
    }

    track(row: DisruptionTrackingItem): TrackState[] {
        return stageTrack(row);
    }

    trackCaption(row: DisruptionTrackingItem): string {
        const steps = stageTrack(row);
        const done = steps.filter(s => s === 'done').length;
        return steps[0] === 'void' ? '—' : `${done}/${steps.length}`;
    }

    open(row: DisruptionTrackingItem): void {
        this.selectedId = row.disruptionId;
    }

    // ── Excel ───────────────────────────────────────────────────────────────

    exportExcel(): void {
        if (!this.total) {
            this.notify.error('İxrac üçün məlumat yoxdur');
            return;
        }
        const state = new TableState();
        state.filter = this.buildFilter();
        state.sorting = { ...this.tableState.sorting };
        state.paginator.page = 0;
        state.paginator.size = this.total;

        this.isExporting = true;
        this.trackingService.list(state)
            .pipe(finalize(() => { this.isExporting = false; }), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => this.writeExcel(res.data?.items ?? []),
                error: () => this.notify.error('İxrac üçün məlumat yüklənmədi'),
            });
    }

    private writeExcel(items: DisruptionTrackingItem[]): void {
        const fmt = (v: string | null, pattern: string) => v ? this.datePipe.transform(this.date(v), pattern, this.tz) ?? '' : '';
        const data = items.map(r => {
            const h = currentHolder(r);
            return {
                'ID': r.disruptionId,
                'Firma': r.firmName,
                'Region': r.regionName,
                'Mağaza kodu': r.locationCode,
                'Mağaza': r.locationName,
                'Şöbə': r.sectionName,
                'Kateqoriya': r.disruptionCategoryName,
                'Səbəb': r.reasonName,
                'Təsvir': r.description,
                'Müfəttiş': r.inspectorName,
                'Mərhələ': stageMeta(r.stageCode).label,
                'Kimdədir': h?.name ?? '',
                'Təsdiq səviyyəsi': h?.role ?? '',
                'Mərhələdə olduğu tarix': fmt(r.stageSince, 'yyyy-MM-dd HH:mm'),
                'Yaradılma': fmt(r.createdDate, 'yyyy-MM-dd HH:mm'),
                'Son tarix': fmt(r.deadlineDate, 'yyyy-MM-dd'),
                'Gecikir': r.isOverdue ? 'Bəli' : '',
            };
        });
        void this.fileExport.exportRowsToExcel(data, 'Uyğunsuzluq izləmə', datedFileName('uygunsuzluq-izleme', 'xlsx'));
    }
}

/** API cavabları `{ data: [...] }` və ya birbaşa massiv qaytara bilir */
function readList<T>(res: any): T[] {
    if (Array.isArray(res?.data)) { return res.data as T[]; }
    if (Array.isArray(res)) { return res as T[]; }
    return [];
}

function fullName(u: { name?: string; surName?: string; firstName?: string; lastName?: string }): string {
    return [u.name ?? u.firstName, u.surName ?? u.lastName].filter(Boolean).join(' ').trim() || '—';
}

/** Axtarış mətninə görə süzür və render sayını məhdudlaşdırır; seçilmiş dəyər həmişə siyahıda qalır */
function limitByQuery<T extends Option>(options: T[], query: string, selected: number | null): T[] {
    const q = query.trim().toLowerCase();
    const matched = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
    const limited = matched.slice(0, OPTION_RENDER_LIMIT);
    if (selected != null && !limited.some(o => o.value === selected)) {
        const current = options.find(o => o.value === selected);
        if (current) { limited.unshift(current); }
    }
    return limited;
}

import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import * as XLSX from 'xlsx';
import { finalize } from 'rxjs';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { Firm } from '../../inspections/firm.model';
import { User } from '../user.model';
import { DailyDistanceReportRow, RoutePlanDto } from '../route-plan.model';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
    selector: 'app-plan-route',
    standalone: true,
    imports: [
        CommonModule,
        NgFor,
        NgIf,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './plan-route.component.html',
    styleUrl: './plan-route.component.scss'
})
export class PlanRouteComponent implements AfterViewInit {
    @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

    public firms: Firm[] = [];
    public inspectors: User[] = [];
    public inspectorFilter = '';
    private allInspectors: User[] = [];
    public filterForm: FormGroup;
    public isLoading = false;
    public route: RoutePlanDto | null = null;
    public searched = false;

    // "Excel yüklə" bölməsi - ayrıca, öz tarix aralığı ilə işləyir və yuxarıdaki xəritə/marşrut
    // axtarışına (filterForm, search(), renderRoute()) heç bir təsir etmir.
    public exportForm: FormGroup;
    public isExporting = false;

    private map!: L.Map;
    private layerGroup!: L.LayerGroup;

    constructor(
        private fb: FormBuilder,
        private inspectionsService: InspectionsService,
        private planService: PlanService,
        private notify: NotificationService
    ) {
        this.filterForm = this.fb.group({
            firmId: [null, Validators.required],
            inspectorId: [null, Validators.required],
            date: [new Date(), Validators.required]
        });

        this.exportForm = this.fb.group({
            dateRange: new FormGroup({
                start: new FormControl<Date | null>(null, Validators.required),
                end: new FormControl<Date | null>(null, Validators.required)
            })
        });

        this.getFirms();
    }

    ngAfterViewInit(): void {
        this.map = L.map(this.mapEl.nativeElement).setView([40.4093, 49.8671], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.map);
        this.layerGroup = L.layerGroup().addTo(this.map);
        setTimeout(() => this.map.invalidateSize(true), 200);
    }

    getFirms(): void {
        this.inspectionsService.getFirms().subscribe((response) => {
            this.firms = response.data;
        });
    }

    onFirmChange(firmId: number): void {
        this.filterForm.patchValue({ inspectorId: null });
        this.inspectorFilter = '';
        this.allInspectors = [];
        this.inspectors = [];
        if (!firmId) return;

        this.planService.getInspectors(firmId, 3).subscribe((response) => {
            this.allInspectors = response.data;
            this.inspectors = response.data;
        });
    }

    onInspectorFilterChange(): void {
        const term = this.inspectorFilter.trim().toLowerCase();
        this.inspectors = !term
            ? this.allInspectors
            : this.allInspectors.filter(i => `${i.name} ${i.surName}`.toLowerCase().includes(term));
    }

    search(): void {
        if (this.filterForm.invalid) {
            this.filterForm.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa müfəttiş və tarix seçin.' });
            return;
        }

        const { inspectorId, date } = this.filterForm.value;
        const dateStr = this.formatDate(date);

        this.isLoading = true;
        this.searched = true;
        this.planService.getRoute(inspectorId, dateStr).pipe(
            finalize(() => this.isLoading = false)
        ).subscribe({
            next: (response) => {
                this.route = response.data;
                this.renderRoute(this.route);
            },
            error: (err) => {
                this.route = null;
                const message = err?.error?.Message || 'Marşrut məlumatı alınarkən xəta baş verdi.';
                this.notify.error('Server xətası', { message });
            }
        });
    }

    exportExcel(): void {
        const firmId = this.filterForm.value.firmId;
        if (!firmId) {
            this.notify.warning('Müəssisə seçilməyib', { message: 'Excel yükləmək üçün əvvəlcə Müəssisə seçin.' });
            return;
        }

        if (this.exportForm.invalid) {
            this.exportForm.markAllAsTouched();
            this.notify.warning('Tarix aralığı seçilməyib', { message: 'Zəhmət olmasa başlanğıc və son tarixi seçin.' });
            return;
        }

        const { start, end } = this.exportForm.value.dateRange;
        const startDate = this.formatDate(start);
        const endDate = this.formatDate(end);

        this.isExporting = true;
        this.planService.getDailyDistanceReport(firmId, startDate, endDate).pipe(
            finalize(() => this.isExporting = false)
        ).subscribe({
            next: (response) => this.writeDistanceReportExcel(response.data, startDate, endDate),
            error: (err) => {
                const message = err?.error?.Message || 'Hesabat alınarkən xəta baş verdi.';
                this.notify.error('Server xətası', { message });
            }
        });
    }

    private writeDistanceReportExcel(rows: DailyDistanceReportRow[], startDate: string, endDate: string): void {
        if (!rows.length) {
            this.notify.warning('Məlumat tapılmadı', { message: 'Seçilmiş tarix aralığında heç bir plan tapılmadı.' });
            return;
        }

        const data = rows.map(r => ({
            'Müfəttiş': r.inspectorName,
            'Tarix': r.date,
            'Mağaza kodu': r.locationCode,
            'Mağaza adı': r.locationName,
            'Status': r.isVisited ? 'İşlənilib' : 'Gediləcək',
            'Məsafə əvvəlkindən (km)': r.distanceFromPreviousKm,
            'Mağazada keçirdiyi vaxt (dəq)': r.workDurationMinutes ?? '',
            'Checklist nəticəsi (%)': r.checklistResult ?? ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Gündəlik məsafə');
        XLSX.writeFile(wb, `gundelik-mesafe-${startDate}_${endDate}.xlsx`);
    }

    private renderRoute(route: RoutePlanDto): void {
        this.layerGroup.clearLayers();

        if (!route.stops.length) {
            return;
        }

        route.stops.forEach((stop) => {
            const marker = L.marker([stop.latitude, stop.longitude], {
                icon: this.numberedIcon(stop.order, stop.isVisited)
            }).bindPopup(
                `<b>${stop.order}. ${stop.locationName}</b><br>${stop.locationCode}` +
                (stop.isVisited ? '<br><span style="color:#10b981">✓ İşlənilib</span>' : '')
            );
            this.layerGroup.addLayer(marker);
        });

        if (route.routeGeometry?.length) {
            const latLngs = route.routeGeometry.map(([lng, lat]) => [lat, lng] as [number, number]);
            const polyline = L.polyline(latLngs, { color: '#3d4fff', weight: 4 });
            this.layerGroup.addLayer(polyline);
            this.map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        } else {
            const bounds = L.latLngBounds(route.stops.map(s => [s.latitude, s.longitude] as [number, number]));
            this.map.fitBounds(bounds, { padding: [30, 30] });
        }

        setTimeout(() => this.map.invalidateSize(true), 100);
    }

    private numberedIcon(order: number, isVisited: boolean): L.DivIcon {
        return L.divIcon({
            html: `<div class="route-marker${isVisited ? ' route-marker--visited' : ''}">${order}</div>`,
            className: 'route-marker-wrapper',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

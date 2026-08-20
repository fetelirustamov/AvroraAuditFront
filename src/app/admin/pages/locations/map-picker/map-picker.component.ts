import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// Leaflet's default marker images are served from angular.json's "leaflet/" asset output
// instead of the package's relative dist/images path, which the Angular build doesn't resolve.
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'leaflet/marker-icon-2x.png',
    iconUrl: 'leaflet/marker-icon.png',
    shadowUrl: 'leaflet/marker-shadow.png'
});

@Component({
    selector: 'app-map-picker',
    standalone: true,
    imports: [CommonModule],
    template: `<div #mapEl class="map-picker"></div>`,
    styleUrl: './map-picker.component.scss'
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
    @Input() lat: number = 40.4093; // default Baku
    @Input() lng: number = 49.8671;
    @Output() pick = new EventEmitter<{ lat: number; lng: number }>();

    @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

    private map!: L.Map;
    private marker!: L.Marker;
    private ro?: ResizeObserver;

    constructor(private zone: NgZone) { }

    ngAfterViewInit(): void {
        this.initMap();
        // Multiple invalidations to handle dialog animations and initial layout
        this.zone.runOutsideAngular(() => {
            setTimeout(() => this.invalidate(), 0);
            setTimeout(() => this.invalidate(), 250);
            setTimeout(() => this.invalidate(), 800);
        });
        // Observe size changes of the container
        this.ro = new ResizeObserver(() => this.invalidate());
        this.ro.observe(this.mapEl.nativeElement);
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
        this.ro?.disconnect();
    }

    @HostListener('window:resize') onWindowResize() { this.invalidate(); }

    private invalidate() {
        this.map?.invalidateSize(true);
    }

    private initMap() {
        this.map = L.map(this.mapEl.nativeElement).setView([this.lat, this.lng], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        this.marker = L.marker([this.lat, this.lng], { draggable: true }).addTo(this.map);
        this.marker.on('dragend', () => {
            const p = this.marker.getLatLng();
            this.emitPick(p.lat, p.lng);
        });
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            this.marker.setLatLng([lat, lng]);
            this.emitPick(lat, lng);
        });
    }

    private emitPick(lat: number, lng: number) {
        this.lat = lat; this.lng = lng;
        this.pick.emit({ lat, lng });
    }
}

import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// Leaflet will be loaded from CDN
declare const L: any;

@Component({
    selector: 'app-map-picker',
    standalone: true,
    imports: [CommonModule],
    template: `<div #mapEl class=\"map-picker\"></div>`,
    styleUrl: './map-picker.component.scss'
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
    @Input() lat: number = 40.4093; // default Baku
    @Input() lng: number = 49.8671;
    @Output() pick = new EventEmitter<{ lat: number; lng: number }>();

    @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

    private map: any;
    private marker: any;
    private scriptEl?: HTMLScriptElement;
    private linkEl?: HTMLLinkElement;
    private ro?: ResizeObserver;

    constructor(private zone: NgZone) { }

    async ngAfterViewInit(): Promise<void> {
        await this.ensureLeaflet();
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
        if (this.map && this.map.invalidateSize) {
            this.map.invalidateSize(true);
        }
    }

    private ensureLeaflet(): Promise<void> {
        return new Promise((resolve) => {
            const w: any = window as any;
            if (w.L && w.L.map) return resolve();
            this.linkEl = document.createElement('link');
            this.linkEl.rel = 'stylesheet';
            this.linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(this.linkEl);

            this.scriptEl = document.createElement('script');
            this.scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            this.scriptEl.async = true;
            this.scriptEl.onload = () => resolve();
            document.head.appendChild(this.scriptEl);
        });
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
        this.map.on('click', (e: any) => {
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
import { DatePipe } from '@angular/common';
import { Component, HostListener, OnChanges, SimpleChanges, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { BAKU_TZ, parseApiUtcDate } from '../../../../shared/utils/date.util';
import { MediaComponent } from '../../../components/media/media.component';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import {
    DisruptionTrackingDetail, Holder, TimelineNode, buildTimeline, currentHolder, stageMeta,
} from '../disruption-tracking.model';
import { DisruptionTrackingService } from '../disruption-tracking.service';

@Component({
    selector: 'app-tracking-detail-panel',
    standalone: true,
    imports: [DatePipe, MediaComponent],
    templateUrl: './tracking-detail-panel.component.html',
    styleUrl: './tracking-detail-panel.component.scss',
})
export class TrackingDetailPanelComponent implements OnChanges {
    readonly disruptionId = input<number | null>(null);
    readonly closed = output<void>();

    readonly MediaType = MediaType;
    readonly Module = Module;
    readonly tz = BAKU_TZ;
    readonly stageMeta = stageMeta;

    detail: DisruptionTrackingDetail | null = null;
    timeline: TimelineNode[] = [];
    holder: Holder | null = null;
    isLoading = false;
    loadError = false;

    constructor(private trackingService: DisruptionTrackingService, private dialog: MatDialog) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['disruptionId']) {
            const id = this.disruptionId();
            if (id) { this.load(id); }
        }
    }

    // Paneldən açılan media baxışı (MatDialog) Esc-i özü bağlayır — panel onunla birlikdə bağlanmamalıdır
    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.disruptionId() && this.dialog.openDialogs.length === 0) { this.closed.emit(); }
    }

    date(value: string | null | undefined): string | null {
        return parseApiUtcDate(value);
    }

    private load(id: number): void {
        this.isLoading = true;
        this.loadError = false;
        this.detail = null;
        this.trackingService.detail(id)
            .pipe(finalize(() => { this.isLoading = false; }))
            .subscribe({
                next: res => {
                    this.detail = res.data;
                    this.timeline = buildTimeline(res.data);
                    this.holder = currentHolder(res.data.header);
                },
                error: () => { this.loadError = true; },
            });
    }
}

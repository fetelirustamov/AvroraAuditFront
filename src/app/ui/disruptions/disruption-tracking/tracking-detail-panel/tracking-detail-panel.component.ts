import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, HostListener, OnChanges, SimpleChanges, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { StatusChipComponent } from '../../../../shared/status/status-chip.component';
import { StatusChange, StatusReasonComponent } from '../../../../shared/status/status-reason.component';
import { DisruptionService } from '../../disruption.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { MediaComponent } from '../../../components/media/media.component';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import {
    DisruptionTrackingDetail, Holder, TimelineNode, buildTimeline, currentHolder, overdueLabel, stageAgeLabel, stageMeta,
} from '../disruption-tracking.model';
import { DisruptionTrackingService } from '../disruption-tracking.service';

/**
 * Uyğunsuzluğun yan paneli. Açılanda fokus panelə keçir və orada qalır (`cdkTrapFocus`),
 * bağlananda CDK fokusu paneli açan elementə (cədvəl sətrinə) qaytarır.
 */
@Component({
    selector: 'app-tracking-detail-panel',
    standalone: true,
    imports: [CdkTrapFocus, AppDatePipe, StatusChipComponent, StatusReasonComponent, ListStateComponent, MediaComponent],
    templateUrl: './tracking-detail-panel.component.html',
    styleUrl: './tracking-detail-panel.component.scss',
})
export class TrackingDetailPanelComponent implements OnChanges {
    private readonly trackingService = inject(DisruptionTrackingService);
    private readonly disruptionService = inject(DisruptionService);
    private readonly dialog = inject(MatDialog);

    readonly disruptionId = input<number | null>(null);
    readonly closed = output<void>();

    readonly MediaType = MediaType;
    readonly Module = Module;
    readonly stageMeta = stageMeta;

    detail: DisruptionTrackingDetail | null = null;
    timeline: TimelineNode[] = [];
    holder: Holder | null = null;
    stageAge: string | null = null;
    overdue: string | null = null;
    /** Son rədd / müfəttişə qaytarma səbəbi (yoxdursa null). */
    statusReason: StatusChange | null = null;
    isLoading = false;
    loadError: string | null = null;

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

    reload(): void {
        const id = this.disruptionId();
        if (id) { this.load(id); }
    }

    private load(id: number): void {
        this.isLoading = true;
        this.loadError = null;
        this.detail = null;
        this.statusReason = null;
        this.disruptionService.getStatusReasons([id]).subscribe({
            // Panel başqa uyğunsuzluğa keçibsə köhnə cavab yazılmasın
            next: res => { if (this.disruptionId() === id) { this.statusReason = res.data?.[0] ?? null; } },
            // Səbəb əlavə məlumatdır: icazə və ya şəbəkə xətasında panel onsuz göstərilir
            error: () => { this.statusReason = null; },
        });
        this.trackingService.detail(id)
            .pipe(finalize(() => { this.isLoading = false; }))
            .subscribe({
                next: res => {
                    this.detail = res.data;
                    this.timeline = buildTimeline(res.data);
                    this.holder = currentHolder(res.data.header);
                    this.stageAge = stageAgeLabel(res.data.header);
                    this.overdue = overdueLabel(res.data.header);
                },
                error: error => {
                    this.loadError = apiErrorMessage(error, 'Detallar yüklənmədi və ya bu uyğunsuzluğa baxmaq icazəniz yoxdur.');
                },
            });
    }
}

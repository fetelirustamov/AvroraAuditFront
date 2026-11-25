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
import { AuthService } from '../../../../auth/auth.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { STATUS_ACTIONS, StatusAction, StatusActionKey, statusActionConfirm } from '../../../../shared/status/status-actions';
import { DisruptionApproveDto } from '../../disruption.model';
import { PLAN_COMPLETED, approverFromAuth, disruptionActionStatus, disruptionActions } from '../../disruption-approval';

/** Bildiriş düymədəki feli təkrarlayır */
const ACTION_SUCCESS: Partial<Record<StatusActionKey, string>> = {
    approve: 'Uyğunsuzluq təsdiqləndi',
    reject: 'Uyğunsuzluq rədd edildi',
    returnToInspector: 'Uyğunsuzluq müfəttişə qaytarıldı',
};

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

    private readonly auth = inject(AuthService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly notify = inject(NotificationService);

    readonly disruptionId = input<number | null>(null);
    /** Cari səhifədə əvvəlki/növbəti sətir varmı (↑/↓ və düymələr) */
    readonly hasPrev = input(false);
    readonly hasNext = input(false);
    readonly closed = output<void>();
    /** ↑/↓: -1 əvvəlki, +1 növbəti sətir */
    readonly step = output<number>();
    /** Status paneldən dəyişdi: siyahı yenilənməlidir */
    readonly changed = output<void>();

    private readonly approver = approverFromAuth(this.auth);
    /** Bu istifadəçinin cari uyğunsuzluqda edə biləcəyi əməliyyatlar */
    actions: StatusAction[] = [];
    /** Müfəttiş mərhələsindədir, amma plan hələ yekunlaşmayıb: təsdiq sonra verilir */
    waitsForPlan = false;
    isSaving = false;

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

    /** ↑/↓ ilə əvvəlki/növbəti qeyd. Dialoq açıqdırsa və ya mətn sahəsində yazılırsa toxunulmur. */
    @HostListener('document:keydown', ['$event'])
    onArrow(event: KeyboardEvent): void {
        if (!this.disruptionId() || this.dialog.openDialogs.length > 0) return;
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
        const delta = event.key === 'ArrowUp' ? -1 : 1;
        if (delta < 0 ? !this.hasPrev() : !this.hasNext()) return;
        event.preventDefault();
        this.step.emit(delta);
    }

    apply(action: StatusAction): void {
        const h = this.detail?.header;
        if (!h || this.isSaving) return;
        const status = disruptionActionStatus(action.key, h.status, this.approver);
        const label = `${h.locationName} – ${h.reasonName || h.sectionName}`;
        if (!action.confirm && !action.requiresReason) {
            this.submit(h.disruptionId, status, action);
            return;
        }
        this.confirmDialog.confirm(statusActionConfirm(action, 1, [label]))
            .subscribe(result => { if (result) this.submit(h.disruptionId, status, action, result.reason); });
    }

    private submit(id: number, status: number, action: StatusAction, reason?: string): void {
        const dto = new DisruptionApproveDto();
        dto.disruptionId = [id];
        dto.status = status;
        dto.reason = reason;
        this.isSaving = true;
        this.disruptionService.aprovePlan([dto])
            .pipe(finalize(() => { this.isSaving = false; }))
            .subscribe({
                next: res => {
                    if (!res?.success) {
                        this.notify.error(res?.message || 'Status dəyişmədi');
                        return;
                    }
                    this.notify.success(ACTION_SUCCESS[action.key] ?? 'Status dəyişdi');
                    this.changed.emit();
                    // Panel açıq qalır: yeni mərhələ və kimdə olduğu dərhal görünür
                    if (this.disruptionId() === id) { this.load(id); }
                },
                error: error => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi')),
            });
    }

    private resolveActions(detail: DisruptionTrackingDetail): void {
        const h = detail.header;
        const keys = disruptionActions(h, this.approver);
        const planReady = h.planStatus === PLAN_COMPLETED;
        this.actions = planReady ? keys.map(k => STATUS_ACTIONS[k]) : [];
        this.waitsForPlan = !planReady && keys.length > 0;
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
        this.actions = [];
        this.waitsForPlan = false;
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
                    this.resolveActions(res.data);
                },
                error: error => {
                    this.loadError = apiErrorMessage(error, 'Detallar yüklənmədi və ya bu uyğunsuzluğa baxmaq icazəniz yoxdur.');
                },
            });
    }
}

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, finalize } from 'rxjs';
import { TableState } from '../../../../models/table-state.model';
import { TableService } from '../../../services/table.service';
import { DisruptionAnswerApproveDto, DisruptionAnswerDTO } from '../../disruption-answer.model';
import { DisruptionAnswerService } from '../../disruption-answer.service';
import { MediaComponent } from '../../../components/media/media.component';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { planStoreLabel } from '../../../plans/plan-row';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { STATUS_ACTIONS, statusActionConfirm } from '../../../../shared/status/status-actions';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { queryNumber, queryString, writeQueryState } from '../../../../shared/utils/query-state';
import { AnswerHistoryDialogComponent } from './answer-history-dialog.component';

/** `confirmStatus`: 1 təsdiq, 2 rədd (səbəb `returnReason`-da saxlanır). */
const CONFIRM_APPROVE = 1;
const CONFIRM_REJECT = 2;

const LIST_URL = '/answers/approve';
const PAGE_SIZES = [10, 25, 50];

/** Bir planın mağaza cavabları: hər cavab təsdiqlənir və ya səbəblə rədd edilir. Plan `?planId=` ilə gəlir. */
@Component({
  selector: 'app-answer-approve-details',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    MediaComponent, PageHeaderComponent, ListStateComponent, AppDatePipe,
  ],
  providers: [TableService],
  templateUrl: './answer-approve-details.component.html',
  styleUrl: './answer-approve-details.component.scss'
})
export class AnswerApproveDetailsComponent implements OnInit, OnDestroy {
  private readonly tableService = inject(TableService);
  private readonly answerService = inject(DisruptionAnswerService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly displayedColumns = ['position', 'sectionName', 'reasonName', 'createdDate', 'description', 'media', 'answer', 'actions'];
  readonly pageSizes = PAGE_SIZES;
  readonly MediaType = MediaType;
  readonly Module = Module;
  readonly approveAction = STATUS_ACTIONS.approve;
  readonly rejectAction = STATUS_ACTIONS.reject;

  planId: number | null = null;
  /** Geri linki: siyahının filtrli URL-i (query `returnUrl`). */
  backLink: UrlTree = this.router.parseUrl(LIST_URL);

  rows: DisruptionAnswerDTO[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];
  loaded = false;
  isLoading = false;
  isSaving = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'disruptionAnswers/getDetails';
    this.tableState.filter['disruptionStatus'] = '2';
    this.tableState.filter['disruptionAnswerStatus'] = '1';
    this.tableState.filter['isCurrent'] = '1'; // Cari olanlar
    // Yalnız mağazanın cavabladığı (level > 1) sətirlər — Admin süzgəcsiz hamısını görür və
    // level 1 sətri burada təsdiqlənsə mağaza cavabı ötürülüb zəncir cavabsız irəliləyir
    this.tableState.filter['isAnswered'] = 'true';
    this.tableState.sorting.direction = 'desc';
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const returnUrl = queryString(q, 'returnUrl');
    if (returnUrl?.startsWith(LIST_URL) && !returnUrl.startsWith(`${LIST_URL}-`)) {
      this.backLink = this.router.parseUrl(returnUrl);
    }

    this.planId = queryNumber(q, 'planId');
    if (this.planId == null) return;
    this.tableState.filter['inspectionPlanId'] = String(this.planId);
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];
    this.load();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  /** Mağaza planın bütün sətirlərində eynidir: başlıq ilk sətirdən qurulur. */
  get title(): string {
    const first = this.rows[0];
    return first ? planStoreLabel(first) : `Plan № ${this.planId}`;
  }

  get subtitle(): string {
    return [`Plan № ${this.planId}`, this.rows[0]?.inspectorName].filter(Boolean).join(' · ');
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    writeQueryState(this.router, { page: event.pageIndex || null, size: event.pageSize });
    this.load();
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableState.paginator.size = this.pageSize;

    this.loadSub = this.tableService.fill(this.tableState)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.loadError = response.message;
            return;
          }
          const items = response.data?.items ?? [];
          // Səhifənin son cavabı təsdiqlənib/rədd edilibsə boş qalan səhifədən bir əvvəlkinə keç
          if (items.length === 0 && this.pageIndex > 0) {
            this.pageIndex--;
            writeQueryState(this.router, { page: this.pageIndex || null });
            this.load();
            return;
          }
          this.loaded = true;
          this.rows = items;
          this.total = response.data?.total ?? 0;
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Cavablar yüklənmədi')),
      });
  }

  rowNumber(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  /** Sətrin dialoqda və ekran oxuyucusunda adı: mağaza və uyğunsuzluğun səbəbi. */
  rowLabel(row: DisruptionAnswerDTO): string {
    return [planStoreLabel(row), row.reasonName || row.sectionName].filter(Boolean).join(' — ');
  }

  openHistory(row: DisruptionAnswerDTO): void {
    this.dialog.open(AnswerHistoryDialogComponent, {
      data: row,
      width: '880px',
      maxWidth: '95vw',
    });
  }

  approve(row: DisruptionAnswerDTO): void {
    const dto = this.baseDto(row, CONFIRM_APPROVE);
    dto.Note = row.note ?? '';
    this.submit(dto);
  }

  /** Server rədd səbəbini (`returnReason`) saxlayır və mağazaya göstərir: səbəb məcburidir. */
  reject(row: DisruptionAnswerDTO): void {
    this.confirmDialog.confirm({
      ...statusActionConfirm(this.rejectAction, 1, [this.rowLabel(row)]),
      message: 'Cavab rədd ediləcək və mağaza yenidən cavab verəcək. Səbəb mağazaya göstərilir.',
      reason: { required: true, minLength: 10, label: 'Rədd səbəbi' },
    }).subscribe(result => {
      if (!result?.reason) return;
      const dto = this.baseDto(row, CONFIRM_REJECT);
      dto.returnReason = result.reason;
      this.submit(dto);
    });
  }

  private baseDto(row: DisruptionAnswerDTO, confirmStatus: number): DisruptionAnswerApproveDto {
    const dto = new DisruptionAnswerApproveDto();
    dto.Id = row.id;
    dto.Level = row.level;
    dto.confirmStatus = confirmStatus;
    dto.answerStatus = row.approveStatus!;
    return dto;
  }

  /** Təsdiq və rədd: ikiqat klik ikinci addım yaratmasın, server mesajı göstərilsin. */
  private submit(dto: DisruptionAnswerApproveDto): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.answerService.AddDisruptionAnswer(dto)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.notify.success(dto.confirmStatus === CONFIRM_REJECT ? 'Cavab rədd edildi' : 'Cavab təsdiqləndi');
          } else {
            this.notify.error(data.message || 'Əməliyyat alınmadı');
          }
          this.load();
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Əməliyyat alınmadı')),
      });
  }
}

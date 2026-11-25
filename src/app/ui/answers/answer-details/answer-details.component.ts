import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { DisruptionAnswerDTO } from '../disruption-answer.model';
import { MediaComponent } from '../../components/media/media.component';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { planStoreLabel } from '../../plans/plan-row';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, queryString, writeQueryState } from '../../../shared/utils/query-state';
import { AnswerFormDialogComponent } from './answer-form-dialog.component';

const LIST_URL = '/answers';
const PAGE_SIZES = [10, 25, 50];

/** Bir planın mağaza cavabı gözləyən uyğunsuzluqları. Plan `?planId=` ilə gəlir. */
@Component({
  selector: 'app-answer-details',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    MediaComponent, PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe,
  ],
  providers: [TableService],
  templateUrl: './answer-details.component.html',
  styleUrl: './answer-details.component.scss'
})
export class AnswerDetailsComponent implements OnInit, OnDestroy {
  private readonly tableService = inject(TableService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly displayedColumns = ['position', 'sectionName', 'disruptionCategoryName', 'reasonName', 'createdDate', 'note', 'internalStatus', 'returnReason', 'media', 'action'];
  readonly pageSizes = PAGE_SIZES;
  readonly MediaType = MediaType;
  readonly Module = Module;

  planId: number | null = null;
  /** Geri linki: siyahının filtrli URL-i (query `returnUrl`). */
  backLink: UrlTree = this.router.parseUrl(LIST_URL);

  rows: DisruptionAnswerDTO[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];
  loaded = false;
  isLoading = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'disruptionAnswers/getDetails';
    this.tableState.filter['disruptionStatus'] = '2';
    this.tableState.filter['level'] = '1';
    this.tableState.filter['disruptionAnswerStatus'] = '1';
    this.tableState.filter['isCurrent'] = 'true';
    this.tableState.sorting.direction = 'desc';
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const returnUrl = queryString(q, 'returnUrl');
    if (returnUrl?.startsWith(LIST_URL) && !returnUrl.startsWith(`${LIST_URL}/`)) {
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

  /** Mağaza və müfəttiş planın bütün sətirlərində eynidir: başlıq ilk sətirdən qurulur. */
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
          // Səhifənin son sətrinə cavab verilibsə boş qalan səhifədən bir əvvəlkinə keç
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
        error: (error) => (this.loadError = apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi')),
      });
  }

  rowNumber(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  openAnswerDialog(row: DisruptionAnswerDTO): void {
    this.dialog.open<AnswerFormDialogComponent, DisruptionAnswerDTO, boolean>(AnswerFormDialogComponent, {
      data: row,
      width: '560px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }
}

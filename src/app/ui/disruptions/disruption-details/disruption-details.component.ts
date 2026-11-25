import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { MediaComponent } from '../../components/media/media.component';
import { TableService } from '../../services/table.service';
import { backLinkFromQuery } from '../disruption-nav';
import { DisruptionDto } from '../disruption.model';

const PAGE_SIZES = [10, 20, 50];

// Yekun statuslu (təsdiqlənmiş / rədd edilmiş) uyğunsuzluqlara yalnız baxış — onay işi Müfəttiş təsdiqi ekranındadır.
// Plan və status URL-dədir (`?plan=…&status=…`): səhifə yenilənəndə və link paylaşılanda açılır.
@Component({
  selector: 'app-disruption-details',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, StatusChipComponent, AppDatePipe, MediaComponent,
  ],
  templateUrl: './disruption-details.component.html',
  styleUrl: './disruption-details.component.scss'
})
export class DisruptionDetailsComponent implements OnInit {
  private readonly tableService = inject(TableService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly displayedColumns = ['inspectorName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'status', 'media'];
  readonly pageSizeOptions = PAGE_SIZES;
  readonly MediaType = MediaType;
  readonly Module = Module;

  readonly backLink: UrlTree = backLinkFromQuery(this.router, this.route, '/disruptions');

  planId: number | null = null;
  rows: DisruptionDto[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];

  /** Başlıq üçün mağaza: plan bir mağazaya aiddir, ilk sətirdən götürülür */
  store: { code: number | string; name: string } | null = null;

  isLoading = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.planId = queryNumber(q, 'plan');
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];

    if (this.planId == null) {
      this.loadError = 'Plan seçilməyib. Siyahıya qayıdıb planı yenidən açın.';
      return;
    }

    this.tableService.api_url = 'disruptions/getDetails';
    this.tableState.sorting.direction = 'desc';
    this.tableState.filter['inspectionPlanStatus'] = '4';
    this.tableState.filter['inspectionPlanId'] = String(this.planId);
    this.tableState.filter['disruptionStatus'] = String(queryNumber(q, 'status') ?? 2);
    this.fill();
  }

  get title(): string {
    if (!this.store) return this.planId != null ? `Plan №${this.planId}` : 'Uyğunsuzluq detalı';
    return `${this.store.name} · ${this.store.code}`;
  }

  get subtitle(): string {
    return this.store && this.planId != null ? `Plan №${this.planId} üzrə uyğunsuzluqlar` : '';
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    void writeQueryState(this.router, { page: e.pageIndex || null, size: e.pageSize === PAGE_SIZES[0] ? null : e.pageSize });
    this.fill();
  }

  fill(): void {
    if (this.planId == null) return;
    this.isLoading = true;
    this.loadError = null;
    this.tableState.paginator.page = this.pageIndex;
    this.tableState.paginator.size = this.pageSize;

    this.tableService.fill(this.tableState).pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => {
        // TableService xətanı udur və `success: false` qaytarır
        if (response.success === false) {
          this.loadError = response.message || 'Uyğunsuzluqlar yüklənmədi';
          return;
        }
        this.rows = response.data?.items ?? [];
        this.total = response.data?.total ?? 0;
        const first = this.rows[0];
        if (first) this.store = { code: first.locationCode, name: first.locationName };
      },
      error: error => this.loadError = apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'),
    });
  }
}

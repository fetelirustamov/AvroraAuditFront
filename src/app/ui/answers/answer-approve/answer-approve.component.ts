import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { Firm } from '../../inspections/firm.model';
import { Location } from '../../inspections/location.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { DisruptionAnswerDTO } from '../disruption-answer.model';
import { planStoreLabel } from '../../plans/plan-row';
import { NotificationService } from '../../../shared/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { setFilter } from '../../../shared/utils/table-filter';
import { queryDate, queryNumber, writeQueryState } from '../../../shared/utils/query-state';

const PAGE_SIZES = [10, 25, 50];

/** Mağazanın cavabladığı, təsdiq gözləyən planlar: cavablar detal səhifəsində təsdiqlənir və ya rədd edilir. */
@Component({
  selector: 'app-answer-approve',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule,
    MatTableModule, MatPaginatorModule, MatProgressBarModule, MatTooltipModule,
    PageHeaderComponent, ListStateComponent, AppDatePipe,
  ],
  providers: [DatePipe, TableService],
  templateUrl: './answer-approve.component.html',
  styleUrl: './answer-approve.component.scss'
})
export class AnswerApproveComponent implements OnInit, OnDestroy {
  private readonly inspectionsService = inject(InspectionsService);
  private readonly tableService = inject(TableService);
  private readonly notify = inject(NotificationService);
  private readonly datePipe = inject(DatePipe);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly displayedColumns = ['position', 'inspectorName', 'locationCode', 'locationName', 'startDate', 'details'];
  readonly pageSizes = PAGE_SIZES;
  readonly storeLabel = planStoreLabel;

  readonly form = new FormGroup({
    firmId: new FormControl<number | null>(null, Validators.required),
    locationCode: new FormControl<number | null>(null),
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
  });

  firms: Firm[] = [];
  locations: Location[] = [];
  rows: DisruptionAnswerDTO[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = PAGE_SIZES[0];
  searched = false;
  isLoading = false;
  loadError: string | null = null;

  private readonly tableState = new TableState();
  private loadSub?: Subscription;

  constructor() {
    this.tableService.api_url = 'disruptionAnswers/disruptionAnswerApprove';
    this.tableState.filter['disruptionStatus'] = '2';
    this.tableState.filter['disruptionAnswerStatus'] = '1';
    this.tableState.filter['isCurrent'] = '1'; // Təsdiq gözləyənlər
    this.tableState.filter['isAnswered'] = 'true'; // Cavablandırılmış planlar
    this.tableState.sorting.direction = 'desc';
  }

  ngOnInit(): void {
    this.getFirms();

    const q = this.route.snapshot.queryParamMap;
    const firmId = queryNumber(q, 'firm');
    this.form.patchValue({
      firmId,
      locationCode: queryNumber(q, 'store'),
      dateRange: { start: queryDate(q, 'from'), end: queryDate(q, 'to') },
    });
    this.pageIndex = queryNumber(q, 'page') ?? 0;
    this.pageSize = queryNumber(q, 'size') ?? PAGE_SIZES[0];

    if (firmId != null) {
      this.getLocations(firmId);
    }
    if (this.form.valid) {
      this.applyFilters();
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  onSelectFirm(firmId: number): void {
    this.form.controls.locationCode.setValue(null);
    this.getLocations(firmId);
  }

  onSearch(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Firmanı seçin.' });
      return;
    }
    this.pageIndex = 0;
    const { firmId, locationCode, dateRange } = this.form.getRawValue();
    writeQueryState(this.router, {
      firm: firmId, store: locationCode, from: dateRange.start, to: dateRange.end, page: null,
    });
    this.applyFilters();
    this.load();
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
          this.searched = true;
          this.rows = response.data?.items ?? [];
          this.total = response.data?.total ?? 0;
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Cavablar yüklənmədi')),
      });
  }

  rowNumber(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  /** Detal səhifəsi planı URL-dən alır: yenilənəndə və geri qayıdanda iş itmir. */
  openDetails(row: DisruptionAnswerDTO): void {
    this.router.navigate(['/answers/approve-details'], {
      queryParams: { planId: row.inspectionPlanId, returnUrl: this.router.url },
    });
  }

  private getFirms(): void {
    this.inspectionsService.getFirms().subscribe({
      next: (response) => (this.firms = response.data ?? []),
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firma siyahısı yüklənmədi')),
    });
  }

  private getLocations(firmId: number): void {
    this.inspectionsService.getLocationByFirmId(firmId).subscribe({
      // API kodu string qaytarır, URL-dən oxunan isə rəqəmdir: mat-select seçimi tanısın
      next: (response) => (this.locations = (response.data ?? []).map(l => ({ ...l, locationCode: Number(l.locationCode) }))),
      error: (error) => this.notify.error(apiErrorMessage(error, 'Mağaza siyahısı yüklənmədi')),
    });
  }

  private applyFilters(): void {
    const { firmId, locationCode, dateRange } = this.form.getRawValue();
    setFilter(this.tableState.filter, 'firmId', firmId);
    setFilter(this.tableState.filter, 'locationCode', locationCode);
    setFilter(this.tableState.filter, 'startDate', this.datePipe.transform(dateRange.start, 'yyyy-MM-dd'));
    setFilter(this.tableState.filter, 'endDate', this.datePipe.transform(dateRange.end, 'yyyy-MM-dd'));
  }
}

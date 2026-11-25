import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { StatusChipComponent } from '../../../shared/status/status-chip.component';
import { planStatusMeta } from '../../../shared/status/status-meta';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';

/** Cədvəl sətri — müfəttiş + plan sayları. */
interface InspectorRow {
  userCode: number;
  name: string;
  email: string;
  planned: number;
  confirmed: number;
  expired: number;
  finished: number;
}

/** Plan saylarının sütunları və onların plan statusu: rəng status-meta-dakı tondan gəlir. */
const COUNT_COLUMNS: { key: 'planned' | 'confirmed' | 'expired' | 'finished'; label: string; status: number }[] = [
  { key: 'planned', label: 'Planlanmış', status: 1 },
  { key: 'confirmed', label: 'Təsdiqlənmiş', status: 2 },
  { key: 'expired', label: 'Vaxtı bitmiş', status: 5 },
  { key: 'finished', label: 'Yekunlaşmış', status: 4 },
];

@Component({
  selector: 'app-plan-user-list',
  standalone: true,
  imports: [
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatCheckboxModule,
    MatPaginatorModule, MatProgressBarModule, PageHeaderComponent, ListStateComponent, StatusChipComponent,
  ],
  templateUrl: './plan-user-list.component.html',
  styleUrl: './plan-user-list.component.scss',
})
export class PlanUserListComponent implements OnInit {
  private readonly inspectionsService = inject(InspectionsService);
  private readonly planService = inject(PlanService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly countColumns = COUNT_COLUMNS.map(c => ({ ...c, tone: planStatusMeta(c.status).tone }));
  readonly displayedColumns = ['select', 'userCode', 'name', 'email', ...COUNT_COLUMNS.map(c => c.key)];
  readonly dataSource = new MatTableDataSource<InspectorRow>();
  readonly selection = new SelectionModel<InspectorRow>(true, []);
  readonly pageSizes = [10, 25];

  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }

  firms: Firm[] = [];
  selectedFirmId: number | null = null;
  searchTerm = '';
  isLoading = false;
  loadError: string | null = null;

  constructor() {
    this.dataSource.filterPredicate = (row, filter) =>
      `${row.name} ${row.email ?? ''} ${row.userCode ?? ''}`.toLowerCase().includes(filter);
  }

  ngOnInit(): void {
    this.getFirms();
    const firmId = queryNumber(this.route.snapshot.queryParamMap, 'firm');
    if (firmId != null) {
      this.selectedFirmId = firmId;
      this.loadInspectors();
    }
  }

  onSelectFirm(firmId: number): void {
    this.selectedFirmId = firmId;
    this.onUserSearch('');
    writeQueryState(this.router, { firm: firmId });
    this.loadInspectors();
  }

  onUserSearch(term: string): void {
    this.searchTerm = term;
    this.dataSource.filter = term.trim().toLowerCase();
  }

  /** "Hamısını seç" yalnız axtarışdan keçən (görünən) sətirlərə aiddir. */
  isAllSelected(): boolean {
    const visible = this.dataSource.filteredData;
    return visible.length > 0 && visible.every((row) => this.selection.isSelected(row));
  }

  isSomeSelected(): boolean {
    return this.dataSource.filteredData.some((row) => this.selection.isSelected(row));
  }

  toggleAllRows(): void {
    const visible = this.dataSource.filteredData;
    if (this.isAllSelected()) {
      this.selection.deselect(...visible);
    } else {
      this.selection.select(...visible);
    }
  }

  checkboxLabel(row?: InspectorRow): string {
    if (!row) {
      return this.isAllSelected() ? 'Bütün seçimləri götür' : 'Hamısını seç';
    }
    return `${this.selection.isSelected(row) ? 'Seçimi götür' : 'Sətri seç'}: ${row.name}`;
  }

  loadInspectors(): void {
    const firmId = this.selectedFirmId;
    if (firmId == null) return;
    this.isLoading = true;
    this.loadError = null;
    this.selection.clear();
    this.planService.getInspectors(firmId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.dataSource.data = (response.data ?? []).map<InspectorRow>((user) => ({
            userCode: user.userCode,
            name: `${user.name} ${user.surName}`.trim(),
            email: user.email,
            planned: user.planned ?? 0,
            confirmed: user.confirmed ?? 0,
            expired: user.expired ?? 0,
            finished: user.finished ?? 0,
          }));
        },
        error: (error) => {
          this.dataSource.data = [];
          this.loadError = apiErrorMessage(error, 'Müfəttiş siyahısı yüklənmədi');
        },
      });
  }

  /** Seçilmiş firma və müfəttişlər plan yaratma səhifəsinə URL ilə ötürülür. */
  onPlanClick(): void {
    const inspectors = this.selection.selected.map((row) => row.userCode).filter(Boolean);
    if (inspectors.length === 0) {
      this.notify.warning('Heç bir müfəttiş seçilməyib', { message: 'Ən azı bir müfəttiş seçin.' });
      return;
    }
    this.router.navigate(['/plans/create'], { queryParams: { firm: this.selectedFirmId, inspector: inspectors } });
  }

  private getFirms(): void {
    this.inspectionsService.getFirms().subscribe({
      next: (response) => (this.firms = response.data ?? []),
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firma siyahısı yüklənmədi')),
    });
  }
}

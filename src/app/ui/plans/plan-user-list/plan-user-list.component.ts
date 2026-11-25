import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { NgFor, NgIf } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { NotificationService } from '../../../shared/services/notification.service';

/** Cədvəl sətri — müfəttiş + plan sayları. */
interface InspectorRow {
  userCode: number;
  email: string;
  planned: number;
  confirmed: number;
  expired: number;
  finished: number;
  customer: { name: string; userCode: number };
}

@Component({
  selector: 'app-plan-user-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatPaginatorModule,
    MatTableModule,
    MatCheckboxModule,
    NgFor,
    NgIf,
    FormsModule,
  ],
  templateUrl: './plan-user-list.component.html',
  styleUrl: './plan-user-list.component.scss',
})
export class PlanUserListComponent {
  displayedColumns: string[] = ['select', 'userCode', 'customer', 'email', 'planned', 'confirmed', 'expired', 'finished'];
  dataSource = new MatTableDataSource<InspectorRow>();
  selection = new SelectionModel<InspectorRow>(true, []);

  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }

  public selectedFirmId = 0;
  public firms: Firm[] = [];
  public pageSize: number[] = [10, 25];
  public searchTerm = '';
  public isLoadingUsers = false;

  constructor(
    private inspectionsService: InspectionsService,
    private planService: PlanService,
    private router: Router,
    private notify: NotificationService,
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras.state as { message: string } | undefined;
    if (state?.message) {
      this.notify.success(state.message);
    }

    this.dataSource.filterPredicate = (data, filter) =>
      `${data.customer?.name ?? ''} ${data.email ?? ''} ${data.userCode ?? ''}`.toLowerCase().includes(filter);

    this.getFirms();
  }

  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }

  onUserSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  /** "Hamısını seç" yalnız axtarışdan keçən (görünən) sətirlərə aiddir. */
  isAllSelected(): boolean {
    const visible = this.dataSource.filteredData;
    return visible.length > 0 && visible.every((row) => this.selection.isSelected(row));
  }

  isSomeSelected(): boolean {
    return this.dataSource.filteredData.some((row) => this.selection.isSelected(row));
  }

  checkboxLabel(row?: InspectorRow): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} ${row.customer.name}`;
  }

  toggleAllRows(): void {
    const visible = this.dataSource.filteredData;
    if (this.isAllSelected()) {
      this.selection.deselect(...visible);
      return;
    }
    this.selection.select(...visible);
  }

  getFirms(): void {
    this.inspectionsService.getFirms().subscribe({
      next: (response) => {
        this.firms = response.data ?? [];
      },
      error: () => {
        this.notify.error('Müəssisə siyahısı yüklənmədi');
      },
    });
  }

  getInspectors(firmId: number): void {
    this.isLoadingUsers = true;
    this.selection.clear();
    this.planService.getInspectors(firmId).subscribe({
      next: (response) => {
        this.dataSource.data = (response.data ?? []).map<InspectorRow>((user) => ({
          userCode: user.userCode,
          email: user.email,
          planned: user.planned ?? 0,
          confirmed: user.confirmed ?? 0,
          expired: user.expired ?? 0,
          finished: user.finished ?? 0,
          customer: { name: `${user.name} ${user.surName}`.trim(), userCode: user.userCode },
        }));
        this.applyFilter();
        this.isLoadingUsers = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.isLoadingUsers = false;
        this.notify.error('Müfəttiş siyahısı yüklənmədi');
      },
    });
  }

  onSelectFirm(selectedFirmId: number): void {
    this.selectedFirmId = selectedFirmId;
    this.searchTerm = '';
    this.dataSource.filter = '';
    this.getInspectors(selectedFirmId);
  }

  onPlanClick(): void {
    if (this.selection.selected.length === 0) {
      this.notify.warning('Heç bir istifadəçi seçilməyib!', {
        message: 'Zəhmət olmasa ən azı bir istifadəçi seçin.',
      });
      return;
    }

    const data = {
      selected: this.selection.selected
        .filter((item) => item.customer.userCode)
        .map((item) => item.customer.userCode),
      organization: this.selectedFirmId,
    };

    this.router.navigate(['plans/create'], { state: { data } });
  }
}

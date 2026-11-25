import { Component, ViewChild } from '@angular/core';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { Firm } from '../../inspections/firm.model';
import { TableState } from '../../../models/table-state.model';
import { PlanApprove } from '../plan.model';
import { TableService } from '../../services/table.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { finalize } from 'rxjs';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { setFilter } from '../../../shared/utils/table-filter';

@Component({
  selector: 'app-plan-actions',
  imports: [MatCardModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatNativeDateModule, MatButtonModule, MatPaginatorModule, MatTableModule, MatCheckboxModule, MatMenuModule, MatTooltipModule, MatDatepickerModule, FormsModule, ReactiveFormsModule, NgFor, CommonModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './plan-actions.component.html',
  styleUrl: './plan-actions.component.scss'
})
export class PlanActionsComponent {

  displayedColumns: string[] = ['select', 'inspectorsName', 'locationCode', 'locationName', 'startDate', 'endDate', 'action'];
  statusOptions = [
    { label: 'Təsdiq gözləyənlər', value: 1 },
    { label: 'Təsdiq olunmuşlar', value: 2 },
    { label: 'Rədd olunmuşlar', value: -1 }
  ];

  public dataSource: InspectionPlan[] = [];  // Düzəldildi
  selection = new SelectionModel<InspectionPlan>(true, []);  // Düzəldildi
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public firms: Firm[] = [];
  planForm!: FormGroup;
  public isLoading = false;
  public isSaving = false;
  public searchTerm: string = '';
  public pageSize: number = 10;
  public status: number = 1;
  private _tableState: TableState = new TableState();
  private planApproveList: PlanApprove[] = [];
  private planApprove: PlanApprove = new PlanApprove();
  //public firmId: number = 0;

  constructor(private inspectionService: InspectionsService,
    private _tableService: TableService,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private planService: PlanService,
    private notify: NotificationService,
  ) {
    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "inspectionPlans/getDetails";
    //this._authenticationService.currentUser.subscribe(x => (this.currentUser = x));
    this._tableState.filter['status'] = "1";
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);
    this.createForm();
  }


  ngAfterViewInit() {
    this.paginator.page.subscribe(() => {
      this._tableState.paginator.page = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.fill();
    });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.length;
    return numSelected === numRows;
  }

  checkboxLabel(row?: InspectionPlan): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id + 1}`;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource);
  }





  getFirms() {
    this.inspectionService.getFirms().subscribe({
      next: (response) => {
        this.firms = response.data;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Müəssisə siyahısı yüklənmədi')),
    });
  }



  createForm() {
    this.planForm = this.fb.group({
      firmId: [null, Validators.required],
      status: [null, Validators.required],
      // end: [null, Validators.required],
      dateRange: new FormGroup({
        start: new FormControl<Date | null>(null),
        end: new FormControl<Date | null>(null),
      }),
    });
  }

  onSearch() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Müəssisə və statusu seçin.' });
      return;
    }

    const formData = this.planForm.value;
    this.status = formData.status;
    const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
    const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');

    setFilter(this._tableState.filter, 'startDate', startDate);
    setFilter(this._tableState.filter, 'status', this.status);
    setFilter(this._tableState.filter, 'endDate', endDate);
    setFilter(this._tableState.filter, 'firmId', formData.firmId);
    // Yeni axtarış ilk səhifədən başlasın
    this._tableState.paginator.page = 0;
    if (this.paginator) this.paginator.pageIndex = 0;

    this.fill();
  }


  private fill() {
    this.isLoading = true;
    this._tableState.paginator.size = Number(this.pageSize);
    if (!this._tableState.filter) {
      this._tableState.filter = {};
    }
    this._tableState.searchTerm = this.searchTerm;

    this._tableService.fill(this._tableState).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        this._tableState.paginator.total = response.data?.total || 0;
        this.dataSource = response.data?.items || [];
        // Toplu əməliyyat yalnız ekranda görünən sətirlərə tətbiq olunsun
        this.selection.clear();
        this.allDataCount = response.data?.total || 0;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Planlar yüklənmədi')),
    });
  }

  // onSelectFirm(selectedFirmId: number) {
  //   this.getLocations(selectedFirmId);
  // }

  // onApprove(value: any) {
  //   console.log(value);


  // }

  changePlanStatus(row: any, status: number) {
    const item = new PlanApprove();
    item.planId = row.id;
    item.status = status;
    this.submitStatuses([item], 'Əməliyyat uğurla tamamlandı');
  }

  changeSelectedPlanStatus(status: number) {
    const items = this.selection.selected.map((row) => {
      const item = new PlanApprove();
      item.planId = row.id;
      item.status = status;
      return item;
    });
    if (items.length === 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }
    this.submitStatuses(items, status === 2 ? 'Planlar təsdiqləndi' : 'Planlar ləğv edildi');
  }

  private submitStatuses(items: PlanApprove[], successMessage: string): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.planService.aprovePlan(items)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          if (data.success) {
            this.notify.success(successMessage);
          }
          this.selection.clear();
          this.fill();
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi'))
      });
  }

}



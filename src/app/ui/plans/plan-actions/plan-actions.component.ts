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
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { finalize } from 'rxjs';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';

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

    this.inspectionService.getFirms().subscribe((response) => {
      this.firms = response.data;
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

  Search() {

  }


  onSearch() {
    if (this.planForm.valid) {
      this.isLoading = true;
      const formData = this.planForm.value;

      const firmId = formData.firmId;
      this.status = formData.status;
      const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
      const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');

      if (startDate != null) {
        this._tableState.filter['startDate'] = startDate;
      }
      if (this.status != null) {
        this._tableState.filter['status'] = this.status.toString();
      }

      if (endDate != null) {
        this._tableState.filter['endDate'] = endDate;
      }

      if (firmId != null) {
        this._tableState.filter['firmId'] = firmId.toString();
      }

      // Backend çağırışı
      this.fill();

    } else {
      console.log('Form düzgün doldurulmayıb.');
    }
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
    ).subscribe((response) => {
      this._tableState.paginator.total = response.data?.total || 0;
      this.dataSource = response.data?.items || [];
      this.allDataCount = response.data?.total || 0;// artıq MatTableDataSource yoxdur
    });
  }

  // onSelectFirm(selectedFirmId: number) {
  //   this.getLocations(selectedFirmId);
  // }

  // onApprove(value: any) {
  //   console.log(value);


  // }

  changePlanStatus(row: any, status: number) {
    this.planApproveList = [];
    this.planApprove = new PlanApprove();
    this.planApprove.planId = row.id;
    this.planApprove.status = status;
    this.planApproveList.push(this.planApprove);

    if (this.planApproveList.length == 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }

    // Burada row.id və ya row-un başqa istədiyin property-lərini işlədə bilərsə
    this.planService.aprovePlan(this.planApproveList).subscribe((data) => {
      if (data.success) {
        this.notify.success('Əməliyyat uğurla tamamlandı');
      }
      this.fill();
    });
  }

  changeSelectedPlanStatus(status: number) {
    this.planApproveList = [];

    this.selection.selected.forEach((row) => {
      this.planApprove = new PlanApprove();
      this.planApprove.planId = row.id;
      this.planApprove.status = status;
      this.planApproveList.push(this.planApprove);
    })

    if (this.planApproveList.length == 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }

    this.planService.aprovePlan(this.planApproveList).subscribe((data) => {
      console.log(data);
      if (data.success) {
        this.notify.success('Plan təstiqləndi');
      }
      this.fill();
    });
  }

}



import { SelectionModel } from '@angular/cdk/collections';
import { AsyncPipe, CommonModule, DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InspectionsService } from '../inspections.service';
import { finalize, Observable, of } from 'rxjs';
import { Firm } from '../firm.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { InspectionPlan } from '../InpectionPlan.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PlanApprove } from '../../plans/plan.model';
import { PlanService } from '../../plans/plan.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';


@Component({
  selector: 'app-inspection-approve',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatNativeDateModule, MatButtonModule, MatPaginatorModule, MatTableModule, MatCheckboxModule, MatMenuModule, MatTooltipModule, MatDatepickerModule, FormsModule, ReactiveFormsModule, NgFor, CommonModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './inspection-approve.component.html',
  styleUrl: './inspection-approve.component.scss'
})


export class InspectionApproveComponent {
  displayedColumns: string[] = ['select', 'inspectorsName', 'locationCode', 'locationName', 'startDate', 'endDate', 'action'];
  public dataSource: InspectionPlan[] = [];  // Düzəldildi
  selection = new SelectionModel<InspectionPlan>(true, []);  // Düzəldildi
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('modalContent') modalContent!: TemplateRef<any>;
  private dialogRef!: MatDialogRef<any>; //

  public firms: Firm[] = [];
  planForm!: FormGroup;
  public isLoading = false;
  public searchTerm: string = '';
  public pageSize: number = 10;

  // public rows$: Observable<InspectionPlan[]> = new Observable<InspectionPlan[]>();
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
    public dialog: MatDialog
  ) {
    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "inspectionPlans/getDetails";
    //this._authenticationService.currentUser.subscribe(x => (this.currentUser = x));
    this._tableState.filter['status'] = "3";
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

  // public inspectionForm = new FormGroup({
  //   firmId: new FormControl<number | null>(null),
  //   locationCode: new FormControl<number | null>(null),
  //   eraziKodu: new FormControl<string>(''),
  //   dateRange: new FormGroup({
  //     start: new FormControl<Date | null>(null),
  //     end: new FormControl<Date | null>(null),
  //   }),
  // });


  createForm() {
    this.planForm = this.fb.group({
      firmId: [null, Validators.required],
      // start: [null, Validators.required],
      // end: [null, Validators.required],
      dateRange: new FormGroup({
        start: new FormControl<Date | null>(null),
        end: new FormControl<Date | null>(null),
      }),
    });
  }


  public searchForm = new FormGroup({
    inspectorName: new FormControl<string>(''),
    locationCode: new FormControl<string>(''),
    locationName: new FormControl<string>(''),
    date: new FormControl<Date | null>(null),
  });




  onSearch() {
    if (this.planForm.valid) {
      this.isLoading = true;
      const formData = this.planForm.value;

      const firmId = formData.firmId;
      const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
      const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');

      if (startDate != null) {
        this._tableState.filter['startDate'] = startDate;
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

    // Burada row.id və ya row-un başqa istədiyin property-lərini işlədə bilərsə
    if (this.planApproveList.length == 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }

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

  openModal(): void {
    this.dialogRef = this.dialog.open(this.modalContent, {
      width: '400px',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'right-panel'
    });

    this.dialogRef.afterClosed().subscribe(result => {
      console.log('Modal bağlandı:', result);
    });
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onSearchSubmit() {
    if (this.searchForm.valid) {
      const formValue = this.searchForm.value as Record<string, any>;
      Object.keys(formValue).forEach(key => {
        const value = formValue[key];
        if (value) {
          if (key === 'date') {
            this._tableState.filter[key] = this.datePipe.transform(value, 'yyyy-MM-dd')?.toString() ?? '';
          } else {
            this._tableState.filter[key] = String(value);
          }
        } else {
          delete this._tableState.filter[key];
        }
      });
      this.fill();
    }
  }

  resetForm() {
    this.searchForm.reset();
  }

}




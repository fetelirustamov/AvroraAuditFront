import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Firm } from '../../inspections/firm.model';
import { TableState } from '../../../models/table-state.model';
import { finalize, Observable } from 'rxjs';
import { InspectionsService } from '../../inspections/inspections.service';
import { TableService } from '../../services/table.service';
import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { Router } from '@angular/router';

import { Location } from '../../inspections/location.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldControl, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { PlanApprove } from '../../plans/plan.model';
import { SelectionModel } from '@angular/cdk/collections';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { NotificationService } from '../../../shared/services/notification.service';
import { DisruptionService } from '../disruption.service';
import { DisruptionApproveDto } from '../disruption.model';
import { AuthService } from '../../../auth/auth.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';

@Component({
  selector: 'app-disruption-middle',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, NgFor, FileUploadModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './disruption-middle.component.html',
  styleUrl: './disruption-middle.component.scss'
})
export class DisruptionMiddleComponent {
  displayedColumns: string[] = ['position', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'details'];
  public dataSource: InspectionPlan[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;


  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  selection = new SelectionModel<InspectionPlan>(true, []);
  allDataCount: number = 0;

  private disruptionApproveList: DisruptionApproveDto[] = [];
  private disruptionApprove: DisruptionApproveDto = new DisruptionApproveDto();
  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  public firms: Firm[] = [];
  public locations: Location[] = [];
  private _tableState: TableState = new TableState();
  public pageSize: Number = 10;
  public isLoading: boolean = false;
  public rows$: Observable<any[]> = new Observable<any[]>();
  public disruptionStatus: number = 0;
  public disruptionApproveStatus: number = 1;
  public isheadInspector: boolean = false;
  classApplied = false;
  private searchTerm: string = "";

  constructor(private inspectionsService: InspectionsService,
    private disruptionService: DisruptionService,
    private notify: NotificationService,
    private _tableService: TableService,
    private datePipe: DatePipe,
    private router: Router,
    private authService: AuthService) {

    const userInfo = this.authService.getUserInfo();
    if (userInfo?.Role?.split(",").includes("HeadInspector") || userInfo?.Role?.split(",").includes("Admin")) {
      this.disruptionStatus = 1;
      this.disruptionApproveStatus = 2;
      this.isheadInspector = true;
    } else if (userInfo?.Role?.split(",").includes("Inspector")) {
      this.disruptionStatus = 0;
      this.disruptionApproveStatus = 1;
      this.isheadInspector = false;
    }

    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "disruptions/plans";
    this._tableState.filter['inspectionPlanStatus'] = "4";
    this._tableState.filter['disruptionStatus'] = this.disruptionStatus.toString();

    if (!this.isheadInspector && userInfo?.Id) {
      this._tableState.filter['inspector'] = userInfo.Id.toString();
    }

    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);

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

  getFirms() {
    this.inspectionsService.getFirms().subscribe((response) => {
      this.firms = response.data;
    });
  }


  getLocations(firmId: number) {
    this.inspectionsService.getLocationByFirmId(firmId).subscribe((response) => {
      this.locations = response.data;
    });
  }

  onSelectFirm(selectedFirmId: number) {
    this.getLocations(selectedFirmId);
  }

  onSelectLocation(selectedLocationId: number) {
    console.log(selectedLocationId);

  }
  toggleClass() {
    this.classApplied = !this.classApplied;
  }

  onFormSubmit() {

    const firmId = this.inspectionsForm.value.firmId;
    if (this.inspectionsForm.valid) {

      this.isLoading = true;
      console.log(this.inspectionsForm.value);
      const formData = this.inspectionsForm.value;
      const locationCode = formData.locationCode;
      const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
      const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');
      if (startDate != null) {
        this._tableState.filter['startDate'] = startDate;
      }
      if (endDate != null) {
        this._tableState.filter['endDate'] = endDate;
      }
      if (locationCode != null) {
        this._tableState.filter['locationCode'] = locationCode.toString();
      }
      if (firmId != null) {
        this._tableState.filter['firmId'] = firmId.toString();
      }
      // Backend çağırışı
      this.fill();
    } else {
      return;
      console.log('Form düzgün doldurulmayıb.');
    }
  }


  private fill() {
    this.isLoading = true;
    // this._tableState.paginator.page = 0;
    this._tableState.paginator.size = Number(this.pageSize);
    if (!this._tableState.filter) {
      this._tableState.filter = {};
    }
    this._tableState.searchTerm = this.searchTerm;
    this._tableService.fill(this._tableState).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe((response) => {
      this._tableState.paginator.total = response.data != null ? response.data.total : 0;
      this.dataSource = response.data.items;
      this.allDataCount = response.data.total;
    });
  }

  public inspectionsForm = new FormGroup({
    firmId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    locationCode: new FormControl<number | null>(null),
    eraziKodu: new FormControl<string>(''),
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
  });

  getRowNumber(index: number): number {
    return this.paginator ? index + 1 + (this.paginator.pageIndex * this.paginator.pageSize) : index + 1;
  }

  onDetails(row: InspectionPlan) {


    this.router.navigate(['disruptions/middle-details'], { state: { data: row, action: true, status: 0 } });

  }

  changePlanStatus(row: any, status: number) {
    console.log(status);
    this.disruptionApproveList = [];
    this.disruptionApprove = new DisruptionApproveDto();
    this.disruptionApprove.inspectionPlanId = row.inspectionPlanId;
    this.disruptionApprove.status = status;
    this.disruptionApproveList.push(this.disruptionApprove);

    if (this.disruptionApproveList.length == 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }

    // Burada row.id və ya row-un başqa istədiyin property-lərini işlədə bilərsə
    this.disruptionService.aprovePlan(this.disruptionApproveList).subscribe((data) => {
      if (data.success) {
        this.notify.success('Əməliyyat uğurla tamamlandı');
      }
      this.fill();
    });
  }



}



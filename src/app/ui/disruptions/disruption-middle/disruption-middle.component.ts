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
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { SelectionModel } from '@angular/cdk/collections';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { AuthService } from '../../../auth/auth.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { setFilter } from '../../../shared/utils/table-filter';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-disruption-middle',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, NgFor, FileUploadModule, AuditLoadingOverlayComponent],
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

  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  public firms: Firm[] = [];
  public locations: Location[] = [];
  private _tableState: TableState = new TableState();
  public pageSize: Number = 10;
  public isLoading: boolean = false;
  public rows$: Observable<any[]> = new Observable<any[]>();
  public isheadInspector: boolean = false;
  classApplied = false;
  private searchTerm: string = "";

  constructor(private inspectionsService: InspectionsService,
    private _tableService: TableService,
    private datePipe: DatePipe,
    private router: Router,
    private authService: AuthService,
    private notify: NotificationService) {

    const userInfo = this.authService.getUserInfo();
    // Admin/HeadInspector bütün müfəttişlərin həm müfəttiş onayı gözləyən (0), həm də onaylanmış (1) uyğunsuzluqlarını görür
    this.isheadInspector = this.authService.hasAnyRole(['HeadInspector', 'Admin']);

    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "disruptions/plans";
    this._tableState.filter['inspectionPlanStatus'] = "4";
    this._tableState.filter['disruptionStatus'] = this.isheadInspector ? "0,1" : "0";

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
    this.inspectionsService.getFirms().subscribe({
      next: (response) => this.firms = response.data,
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi'))
    });
  }


  getLocations(firmId: number) {
    this.inspectionsService.getLocationByFirmId(firmId).subscribe({
      next: (response) => this.locations = response.data,
      error: (error) => this.notify.error(apiErrorMessage(error, 'Mağazalar yüklənmədi'))
    });
  }

  onSelectFirm(selectedFirmId: number) {
    this.getLocations(selectedFirmId);
  }

  toggleClass() {
    this.classApplied = !this.classApplied;
  }

  onFormSubmit() {
    if (this.inspectionsForm.invalid) {
      this.inspectionsForm.markAllAsTouched();
      this.notify.warning('Firma seçin');
      return;
    }

    const formData = this.inspectionsForm.value;
    const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
    const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');
    setFilter(this._tableState.filter, 'startDate', startDate);
    setFilter(this._tableState.filter, 'endDate', endDate);
    setFilter(this._tableState.filter, 'locationCode', formData.locationCode);
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
        this.allDataCount = response.data?.total || 0;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Planlar yüklənmədi'))
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


}



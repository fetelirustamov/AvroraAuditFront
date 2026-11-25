import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Firm } from '../../inspections/firm.model';
import { Page, Sort, TableState } from '../../../models/table-state.model';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { PlanApprove } from '../../plans/plan.model';
import { SelectionModel } from '@angular/cdk/collections';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { DisruptionListCacheService, DisruptionListSnapshot } from '../disruption-list-cache.service';
import { setFilter } from '../../../shared/utils/table-filter';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';


@Component({
  selector: 'app-disruption-list',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, NgFor, FileUploadModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './disruption-list.component.html',
  styleUrl: './disruption-list.component.scss'
})
export class DisruptionListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['position', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'details'];
  public dataSource: InspectionPlan[] = [];
  statusOptions = [
    // { label: 'Təsdiq gözləyənlər', value: 1 },
    { label: 'Təsdiqlənmişlər', value: 2 },
    { label: 'Rədd edilmişlər', value: -1 }
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;


  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  selection = new SelectionModel<InspectionPlan>(true, []);
  allDataCount: number = 0;

  // private planApproveList: PlanApprove[] = [];
  // private planApprove: PlanApprove = new PlanApprove();
  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  public disruptionStatus: number = 2; // Default status
  public firms: Firm[] = [];
  public locations: Location[] = [];
  private _tableState: TableState = new TableState();
  public pageSize: Number = 10;
  public isLoading: boolean = false;
  public rows$: Observable<any[]> = new Observable<any[]>();
  public pageSizeOptions: number[] = [10, 20, 50];
  classApplied = false;
  private searchTerm: string = "";
  private pendingPaginatorSync = false;
  private skipPaginatorPageEventOnce = false;

  constructor(private inspectionsService: InspectionsService, private _tableService: TableService, private datePipe: DatePipe, private router: Router,
    private disruptionListCache: DisruptionListCacheService, private notify: NotificationService) {

    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "disruptions/plans";
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);

  }

  ngOnInit(): void {
    const restored = this.disruptionListCache.consumeSnapshot();
    if (restored) {
      this.applySnapshot(restored);
    }
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this._tableState.paginator.page = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      if (this.skipPaginatorPageEventOnce) {
        this.skipPaginatorPageEventOnce = false;
        return;
      }
      this.fill();
    });

    if (this.pendingPaginatorSync) {
      this.pendingPaginatorSync = false;
      this.skipPaginatorPageEventOnce = true;
      queueMicrotask(() => {
        if (!this.paginator) {
          return;
        }
        this.paginator.pageIndex = this._tableState.paginator.page;
        this.paginator.pageSize = Number(this._tableState.paginator.size);
      });
    }

    setTimeout(() => {
      this.skipPaginatorPageEventOnce = false;
    }, 0);
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
    this.disruptionStatus = formData.status ?? 2; // Status seçilməyibsə təsdiqlənmişlər
    const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
    const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');
    setFilter(this._tableState.filter, 'startDate', startDate);
    setFilter(this._tableState.filter, 'endDate', endDate);
    setFilter(this._tableState.filter, 'disruptionStatus', this.disruptionStatus);
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
      error: (error) => this.notify.error(apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'))
    });
  }

  public inspectionsForm = new FormGroup({
    status: new FormControl<number | null>(null),
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
    this.disruptionListCache.save(this.buildSnapshot());
    row.disruptionStatus = 2; // Burada disruptionStatus-u 2 olaraq təyin edirik
    this.router.navigate(['disruptions/details'], { state: { data: row, status: this.disruptionStatus } });

  }

  private buildSnapshot(): DisruptionListSnapshot {
    return {
      tableState: JSON.parse(JSON.stringify(this._tableState)) as TableState,
      dataSource: JSON.parse(JSON.stringify(this.dataSource)) as InspectionPlan[],
      allDataCount: this.allDataCount,
      searchTerm: this.searchTerm,
      pageSize: Number(this.pageSize),
      disruptionStatus: this.disruptionStatus,
      inspectionsFormValue: this.inspectionsForm.getRawValue(),
    };
  }

  private applySnapshot(snap: DisruptionListSnapshot): void {
    const raw = snap.tableState as unknown as {
      filter: Record<string, string>;
      paginator: Page;
      sorting: Sort;
      searchTerm: string;
    };
    this._tableState = new TableState();
    this._tableState.filter = { ...raw.filter };
    this._tableState.paginator = Object.assign(new Page(), raw.paginator);
    this._tableState.sorting = Object.assign(new Sort(), raw.sorting);
    this._tableState.searchTerm = raw.searchTerm ?? '';

    this.dataSource = snap.dataSource;
    this.allDataCount = snap.allDataCount;
    this.searchTerm = snap.searchTerm;
    this.pageSize = snap.pageSize;
    this.disruptionStatus = snap.disruptionStatus;

    this.inspectionsForm.patchValue(snap.inspectionsFormValue as any);

    const firmId = this.inspectionsForm.controls.firmId.value;
    if (firmId) {
      this.getLocations(firmId);
    }
    this.pendingPaginatorSync = true;
  }

}




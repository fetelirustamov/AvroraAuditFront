import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule, DatePipe, NgFor } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { Observable, finalize } from 'rxjs';
import { TableState } from '../../models/table-state.model';
import { TableService } from '../services/table.service';
import { Firm } from '../inspections/firm.model';
import { InspectionPlan } from '../inspections/InpectionPlan.model';
import { InspectionsService } from '../inspections/inspections.service';
import { DisruptionAnswerService } from './disruption-answer.service';

import { Location } from '../inspections/location.model';
import { AuditLoadingOverlayComponent } from '../components/audit-loading-overlay/audit-loading-overlay.component';
import { setFilter } from '../../shared/utils/table-filter';
import { apiErrorMessage } from '../../shared/utils/api-error';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-answers',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, NgFor, FileUploadModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './answers.component.html',
  styleUrl: './answers.component.scss'
})
export class AnswersComponent {

  displayedColumns: string[] = ['position', 'inspectorName', 'locationCode', 'locationName', 'startDate', 'details'];
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

  classApplied = false;
  private searchTerm: string = "";

  constructor(private inspectionsService: InspectionsService, private disruptionAnswerService: DisruptionAnswerService, private _tableService: TableService, private datePipe: DatePipe, private router: Router, private notify: NotificationService) {

    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "disruptionAnswers/disruptionAnswersByLocations";
    this._tableState.filter['disruptionStatus'] = "2";
    this._tableState.filter['disruptionAnswerStatus'] = "1";
    this._tableState.filter['isAnswered'] = "false";
    this._tableState.filter['approveStatus'] = "0";


    // this._tableState.filter['level'] = "1";
    this._tableState.filter['isCurrent'] = "true";
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
      next: (response) => {
        this.firms = response.data;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Müəssisə siyahısı yüklənmədi')),
    });
  }


  getLocations(firmId: number) {
    this.inspectionsService.getLocationByFirmId(firmId).subscribe({
      next: (response) => {
        this.locations = response.data;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Lokasiya siyahısı yüklənmədi')),
    });
  }

  onSelectFirm(selectedFirmId: number) {
    this.getLocations(selectedFirmId);
  }

  onSelectLocation(selectedLocationId: number) {
    // console.log(selectedLocationId);

  }
  toggleClass() {
    this.classApplied = !this.classApplied;
  }

  onFormSubmit() {
    if (this.answerForm.invalid) {
      this.answerForm.markAllAsTouched();
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Müəssisəni seçin.' });
      return;
    }

    const formData = this.answerForm.value;
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
      error: (error) => this.notify.error(apiErrorMessage(error, 'Cavablar yüklənmədi')),
    });
  }

  public answerForm = new FormGroup({
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

    // row.disruptionStatus = 2; // Burada disruptionStatus-u 2 olaraq təyin edirik
    this.router.navigate(['answers/details'], { state: { data: row, action: false, status: 1, isCurrent: true } });

  }

}




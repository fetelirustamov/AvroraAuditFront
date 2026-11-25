import { SelectionModel } from '@angular/cdk/collections';
import { AsyncPipe, CommonModule, DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
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
import { InspectionsService } from '../../inspections/inspections.service';
import { finalize, Observable, of } from 'rxjs';
import { Firm } from '../../inspections/firm.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TableState } from '../../../models/table-state.model';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { PlanService } from '../plan.service';
import { PlanApprove } from '../plan.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { TableService } from '../../services/table.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { setFilter } from '../../../shared/utils/table-filter';

/** InspectionPlans.Status: 4 = yekunlaşmış yoxlama, rədd edilən plan 2-yə (təsdiqlənmiş) qayıdır */
const CompletedPlanStatus = 4;
const RejectedPlanStatus = 2;


@Component({
  selector: 'app-plan-checked',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatNativeDateModule, MatButtonModule, MatPaginatorModule, MatTableModule, MatCheckboxModule, MatMenuModule, MatTooltipModule, MatDatepickerModule, FormsModule, ReactiveFormsModule, NgFor, CommonModule, AuditLoadingOverlayComponent],
  providers: [DatePipe],
  templateUrl: './plan-checked.component.html',
  styleUrl: './plan-checked.component.scss'
})


export class PlanCheckedComponent {
  displayedColumns: string[] = ['select', 'inspectorsName', 'locationCode', 'locationName', 'startDate', 'endDate', 'action'];
  public dataSource: InspectionPlan[] = [];  // Düzəldildi
  selection = new SelectionModel<InspectionPlan>(true, []);  // Düzəldildi
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;


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
      return this.isAllSelected() ? 'Bütün seçimləri götür' : 'Hamısını seç';
    }
    return `${this.selection.isSelected(row) ? 'Seçimi götür' : 'Seç'}: sətir ${row.id + 1}`;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource);
  }


  public firms: Firm[] = [];
  planForm!: FormGroup;
  public isLoading = false;
  public isSaving = false;
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
    private notify: NotificationService
  ) {
    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "inspectionPlans/getDetails";
    //this._authenticationService.currentUser.subscribe(x => (this.currentUser = x));
    this._tableState.filter['status'] = String(CompletedPlanStatus);
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);
    this.createForm();
  }


  getFirms() {
    this.inspectionService.getFirms().subscribe({
      next: (response) => {
        this.firms = response.data;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Firma siyahısı yüklənmədi')),
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


  onSearch() {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      this.notify.warning('Məcburi sahələr seçilməyib', { message: 'Firmanı seçin.' });
      return;
    }

    const formData = this.planForm.value;
    const startDate = this.datePipe.transform(formData.dateRange?.start, 'yyyy-MM-dd');
    const endDate = this.datePipe.transform(formData.dateRange?.end, 'yyyy-MM-dd');

    setFilter(this._tableState.filter, 'startDate', startDate);
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

  rejectPlan(row: any) {
    const planId = this.resolvePlanId(row);
    if (!planId) {
      this.notify.warning('Plan tapılmadı');
      return;
    }

    this.submitReject([{ planId, status: RejectedPlanStatus } as PlanApprove]);
  }

  rejectSelectedPlans() {
    this.planApproveList = this.selection.selected
      .map((row) => {
        const planApprove = new PlanApprove();
        planApprove.planId = this.resolvePlanId(row);
        planApprove.status = RejectedPlanStatus;
        return planApprove;
      })
      .filter((item) => item.planId > 0);

    if (this.planApproveList.length == 0) {
      this.notify.warning('Heç bir plan seçilməyib');
      return;
    }

    this.submitReject(this.planApproveList);
  }

  private resolvePlanId(row: any): number {
    return Number(row?.id ?? row?.Id ?? row?.planId ?? 0);
  }

  private submitReject(items: PlanApprove[]): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.planService.aprovePlan(items)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (data) => {
          const updatedCount = Number(data?.data ?? 0);
          if (data?.success && updatedCount > 0) {
            this.notify.success(updatedCount > 1 ? 'Planlar yenidən açıldı' : 'Plan yenidən açıldı');
            this.selection.clear();
            this.fill();
            return;
          }
          this.notify.error(data?.message || 'Status dəyişmədi');
        },
        // 409: uyğunsuzluqları artıq mağaza zəncirinə düşmüş plan geri qaytarılmır - səbəbi göstər
        error: (error) => this.notify.error(apiErrorMessage(error, 'Status dəyişmədi'))
      });
  }

}




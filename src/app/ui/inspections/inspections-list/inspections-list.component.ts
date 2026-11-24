import { AsyncPipe, CommonModule, DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, Component, Input, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { InspectionsService } from '../inspections.service';
import { Firm } from '../firm.model';
import { Location } from '../location.model';
import { debounceTime, finalize, Observable, Subject } from 'rxjs';
import { TableService } from '../../services/table.service';
import { Page, Sort, TableState } from '../../../models/table-state.model';
import { InspectionPlan } from '../InpectionPlan.model';
import { Router } from '@angular/router';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { InspectionsListCacheService, InspectionsListSnapshot } from '../inspections-list-cache.service';

@Component({
  selector: 'app-inspections-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatMenuModule,
    MatTableModule,
    CommonModule,
    MatPaginatorModule,
    AuditLoadingOverlayComponent,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    ReactiveFormsModule,
    NgxMaterialTimepickerModule,
    NgFor,
    NgIf,
    MatSortModule
  ],
  providers: [DatePipe],
  templateUrl: './inspections-list.component.html',
  styleUrl: './inspections-list.component.scss'
})
export class InspectionsListComponent implements AfterViewInit {

  displayedColumns: string[] = ['position', 'inspectorsName', 'locationCode', 'locationName', 'startDatee', 'startDate', 'endDate', 'action'];


  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Input() data: any; // Yeni data üçün input
  public dataSource: InspectionPlan[] = [];
  public isProfilePage: boolean = false;
  filterSubject = new Subject<{ key: string, value: string }>();
  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  public firms: Firm[] = [];
  public locations: Location[] = [];
  public allDataCount: number = 0;
  private _tableState: TableState = new TableState();
  public pageSize: Number = 10;
  public isLoading: boolean = false;
  public rows$: Observable<any[]> = new Observable<any[]>();
  public rowData: any[] = [];
  public receivedData: any; // Yeni data üçün dəyişən
  private searchTerm: string = "";
  private pendingPaginatorSync = false;
  private skipPaginatorPageEventOnce = false;

  constructor(private inspectionsService: InspectionsService,
    private _tableService: TableService,
    private datePipe: DatePipe,
    private router: Router,
    private inspectionsListCache: InspectionsListCacheService) {
    this.getFirms();

    this._tableState = new TableState();
    this._tableService.api_url = "inspectionPlans/getDetails";
    this._tableState.filter['status'] = "4";
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);

    this.filterSubject.pipe(
      debounceTime(500)
    ).subscribe(filter => {
      if (filter.value) {
        this._tableState.filter[filter.key] = filter.value;
      } else {
        delete this._tableState.filter[filter.key];
      }
      this.fill();
    });

  }
  ngOnInit(): void {
    const restored = this.inspectionsListCache.consumeSnapshot();
    if (restored) {
      this.applySnapshot(restored);
      return;
    }

    console.log("List komponentinə gələn data:", this.data);
    if (this.data && this.data.count > 0) {
      this.receivedData = this.data;
      // Yeni datanı filter-ə əlavə et
      if (this.receivedData.firmId && this.receivedData.locationCode) {
        this._tableState.filter['firmId'] = this.receivedData.firmId.toString();
        this._tableState.filter['locationCode'] = this.receivedData.locationCode.toString();
      }
      this.fill();
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.isProfilePage = true;
      // Yeni gələn datanı dataSource-a əlavə et
      if (changes['data'].currentValue?.count > 0) {
        this.receivedData = changes['data'].currentValue;

        // Yeni datanı filter-ə əlavə et
        if (this.receivedData.firmId && this.receivedData.locationCode) {
          this._tableState.filter['firmId'] = this.receivedData.firmId.toString();
          this._tableState.filter['locationCode'] = this.receivedData.locationCode.toString();
        }

        this.fill();
      }
    }
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


  onFormSubmit() {
    if (this.inspectionsForm.valid) {
      this.isLoading = true;
      const formData = this.inspectionsForm.value;

      const firmId = formData.firmId;
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
      this._tableState.paginator.total = response.data?.total || 0;
      this.dataSource = response.data?.items || [];
      this.allDataCount = response.data?.total || 0;
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
    this.inspectionsListCache.save(this.buildSnapshot());
    this.router.navigate(['/inspections/details'], {
      queryParams: {
        id: row.id,
        // Hazırda planId ayrıca sahə deyil, planın özü id ilə eynidir
        planId: row.id,
        returnUrl: this.router.url
      },
      state: { ...row, planId: row.id, returnUrl: this.router.url }
    });
  }


  applyFilter(event: Event, key: string) {
    const inputValue = (event.target as HTMLInputElement).value.trim();
    this.filterSubject.next({ key, value: inputValue });
  }

  private buildSnapshot(): InspectionsListSnapshot {
    return {
      tableState: JSON.parse(JSON.stringify(this._tableState)) as TableState,
      dataSource: JSON.parse(JSON.stringify(this.dataSource)) as InspectionPlan[],
      allDataCount: this.allDataCount,
      searchTerm: this.searchTerm,
      pageSize: Number(this.pageSize),
      inspectionsFormValue: this.inspectionsForm.getRawValue(),
    };
  }

  private applySnapshot(snap: InspectionsListSnapshot): void {
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

    this.inspectionsForm.patchValue(snap.inspectionsFormValue as any);

    const firmId = (snap.inspectionsFormValue as { firmId?: number } | null)?.firmId;
    if (firmId) {
      this.getLocations(firmId);
    }
    this.pendingPaginatorSync = true;
  }

}


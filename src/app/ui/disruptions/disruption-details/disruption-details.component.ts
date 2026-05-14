import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { NotificationService } from '../../../shared/services/notification.service';
import { Router } from '@angular/router';
import { Validators } from 'ngx-editor';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { Disruption, DisruptionDto, DisruptionApproveDto } from '../disruption.model';
import { DisruptionService } from '../disruption.service';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { MediaComponent } from '../../components/media/media.component';

@Component({
  selector: 'app-disruption-details',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatMenuModule,
    MatCardModule,
    MatBadgeModule,
    MatDialogModule,
    MatTooltipModule,
    FileUploadModule,
    MediaComponent
  ],
  providers: [DatePipe],
  templateUrl: './disruption-details.component.html',
  styleUrl: './disruption-details.component.scss'
})
export class DisruptionDetailsComponent {


  displayedColumns: string[] = ['select', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'media'];
  displayedColumnsWithActions: string[] = ['select', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'media', 'action'];
  public dataSource: DisruptionDto[] = [];
  selection = new SelectionModel<DisruptionDto>(true, []);
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public isLoading = false;
  public searchTerm: string = '';
  public pageSize: number = 10;
  public pageSizeOptions: number[] = [5, 10, 20]; // Səhifə ölçüsü seçimləri
  public data: any;
  public status: any;
  public action: boolean = false;
  public isheadInspector = false;
  public disruptionStatus: number = 0;
  public disruptionApproveStatus: number = 1;
  private _tableState: TableState = new TableState();
  private disruptionApproveList: DisruptionApproveDto[] = [];
  private disruptionApprove: DisruptionApproveDto = new DisruptionApproveDto();
  MediaType = MediaType;
  Module = Module;
  editForm!: FormGroup;
  isEditDialogOpen = false;
  selectedDisruption: DisruptionDto | null = null;
  reasons: any[] = [];

  constructor(
    private _tableService: TableService,
    private disruptionService: DisruptionService,
    private notify: NotificationService,
    private router: Router,
    private location: Location,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    if (this.authService.getUserInfo().Role.split(",").includes("HeadInspector")) {
      // this.disruptionStatus = 1;
      this.disruptionApproveStatus = 1;
      this.isheadInspector = true;
    }

    this._tableService.api_url = 'disruptions/getDetails';
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = 'desc';
    this._tableState.paginator.size = this.pageSize;

    this._tableState.filter['inspectionPlanStatus'] = "4";
    this._tableState.filter['disruptionStatus'] = this.disruptionStatus.toString();


    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      this.data = state["data"];
      this.disruptionStatus = state["status"]; // row obyekti
      this.action = state["action"];
      this._tableState.filter['disruptionStatus'] = this.disruptionStatus.toString();
      if (this.action == false) {
        this._tableState.filter['inspectionPlanId'] = this.data.id.toString();
      } else {
        this._tableState.filter['inspectionPlanId'] = this.data.inspectionPlanId.toString();
      }
      sessionStorage.removeItem('redirectedFromMissingState');
    } else {
      // Daha əvvəl back edilmişikmi?
      const alreadyRedirected = sessionStorage.getItem('redirectedFromMissingState');

      if (!alreadyRedirected && window.history.length > 1) {
        sessionStorage.setItem('redirectedFromMissingState', 'true');
        // this.location.back();
      } else {
        // İkinci dəfə buraya düşübsə, boş səhifədə qala bilərik və ya default route
        console.warn('Əvvəlki səhifəyə yönləndirildi və geri qayıdıldı, amma data yoxdur.');
        // Optional: this.router.navigate(['/home']);
      }
    }
  }

  ngOnInit() {
    this.editForm = this.fb.group({
      sectionName: [{ value: '', disabled: true }, Validators.required],
      disruptionCategoryName: [{ value: '', disabled: true }, Validators.required],
      disruptionReasonId: ['', Validators.required],
      deadline: ['', Validators.required],
      description: ['', Validators.required],
      media: ['']
    });

    this.fill(); // Məlumatları ilkin yüklə
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.paginator.page.subscribe(() => {
        this._tableState.paginator.page = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this._tableState.paginator.size = this.pageSize;
        this.fill();
      });
    } else {
      console.warn('MatPaginator is not initialized in ngAfterViewInit');
    }
  }

  onPageSizeChange(newPageSize: any) {
    this.pageSize = newPageSize;
    this._tableState.paginator.size = this.pageSize;
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator.pageIndex = 0; // Səhifəni sıfırlayır
      this.fill();
    }
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.length;
    return numSelected === numRows;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    // this.dataSource.filter. = filterValue.trim().toLowerCase();
  }

  checkboxLabel(row?: DisruptionDto): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id + 1}`;
  }

  onSelectFirm(selectedFirmId: number) {
    //this.getLocations(selectedFirmId);
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource);
  }

  private fill() {
    this.isLoading = true;
    this._tableState.paginator.size = this.pageSize;
    if (!this._tableState.filter) {
      this._tableState.filter = {};
    }
    this._tableState.searchTerm = this.searchTerm;

    this._tableService.fill(this._tableState).pipe(
      finalize(() => {
        this.isLoading = false;
        // this.cdr.detectChanges();
      })
    ).subscribe((response) => {
      this._tableState.paginator.total = response.data?.total || 0;
      this.dataSource = response.data?.items || [];
      this.allDataCount = response.data?.total || 0;
    });
  }

  changeDisruptionStatus(row: DisruptionDto, status: number) {
    this.disruptionApproveList = [];
    this.disruptionApprove = new DisruptionApproveDto();
    this.disruptionApprove.disruptionId.push(row.disruptionId);
    this.disruptionApprove.status = status;
    this.disruptionApproveList.push(this.disruptionApprove);

    this.disruptionService.aprovePlan(this.disruptionApproveList).subscribe((data) => {
      if (data.success) {
        this.notify.success('Əməliyyat uğurla tamamlandı');
      }
      this.fill();
    });
  }

  changeSelectedDisruptionStatus(status: number) {
    this.disruptionApproveList = [];
    this.selection.selected.forEach((row) => {
      this.disruptionApprove = new DisruptionApproveDto();
      this.disruptionApprove.disruptionId.push(row.disruptionId);
      this.disruptionApprove.status = status;
      this.disruptionApproveList.push(this.disruptionApprove);
    });

    this.disruptionService.aprovePlan(this.disruptionApproveList).subscribe((data) => {
      if (data.success) {
        this.notify.success('Uyğunsuzluq təstiqləndi');
      }
      this.fill();
    });
  }

  openEditDialog(disruption: DisruptionDto) {
    this.selectedDisruption = disruption;
    this.selectedDisruption.id = disruption.disruptionId;
    this.editForm.patchValue({
      id: disruption.disruptionId,
      sectionName: disruption.sectionName,
      disruptionCategoryName: disruption.disruptionCategoryName,
      disruptionReasonId: disruption.disruptionReasonId,
      deadline: disruption.deadline,
      description: disruption.description,
      media: ''
    });
    this.isEditDialogOpen = true;

    // Load reasons for the category
    this.loadReasons(disruption.disruptionCategoryId);
  }

  loadReasons(categoryId: number) {
    this.disruptionService.getReasonsByCategory(categoryId).subscribe({
      next: (response) => {
        if (response.success) {
          this.reasons = response.data || [];
        }
      },
      error: (error) => {
        console.error('Error loading reasons:', error);
        this.reasons = [];
      }
    });
  }

  closeEditDialog() {
    this.isEditDialogOpen = false;
    this.selectedDisruption = null;
    this.editForm.reset();
  }

  SaveEdit() {
    if (this.editForm.valid && this.selectedDisruption) {
      const updatedDisruption: Disruption = {
        id: this.selectedDisruption.disruptionId,
        inspectorId: this.selectedDisruption.inspectorId,
        inspectionPlanId: this.selectedDisruption.inspectionPlanId,
        sectionId: this.selectedDisruption.sectionId,
        severityId: 0,
        disruptionReasonId: this.editForm.value.disruptionReasonId,
        createdDate: this.selectedDisruption.createdDate,
        description: this.editForm.value.description,
        deadline: this.editForm.value.deadline ?? null,
        questionResultDetailsId: 0,
        localId: ''
      };

      this.disruptionService.updateDisruption(updatedDisruption).subscribe({
        next: (response: { success: boolean }) => {
          if (response.success) {
            this.notify.success('Uyğunsuzluq yeniləndi');
            this.closeEditDialog();
            this.fill();
          }
        },
        error: (error: any) => {
          this.notify.error('Xəta baş verdi');
        }
      });
    }
  }
}
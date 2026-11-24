import { Component, ViewChild, AfterViewInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { Disruption, DisruptionApproveDto, DisruptionDto } from '../../disruption.model';
import { RequestResponseOne } from '../../../../models/table-state.model';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableState } from '../../../../models/table-state.model';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { DisruptionService } from '../../disruption.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { finalize } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { AuthService } from '../../../../auth/auth.service';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { MediaComponent } from '../../../components/media/media.component';
import { TableService } from '../../../services/table.service';
import { AttachmentService } from '../../../../admin/services/attachment.service';

@Component({
  selector: 'app-disruption-middle-details',
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
  templateUrl: './disruption-middle-details.component.html',
  styleUrls: ['./disruption-middle-details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DisruptionMiddleDetailsComponent implements AfterViewInit {

  displayedColumns: string[] = ['select', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'media'];
  displayedColumnsWithActions: string[] = ['select', 'inspectorName', 'locationCode', 'locationName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'media', 'action'];
  public dataSource: DisruptionDto[] = [];
  selection = new SelectionModel<DisruptionDto>(true, []);
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public isLoading = false;
  public isSaving = false;
  public searchTerm: string = '';
  public pageSize: number = 10;
  public pageSizeOptions: number[] = [5, 10, 20]; // Səhifə ölçüsü seçimləri
  public data: any;
  public action: boolean = false;
  public isheadInspector = false;
  /** Redaktə Inspector və Admin üçün */
  public isInspector = false;
  public isAdmin = false;
  private _tableState: TableState = new TableState();
  private disruptionApproveList: DisruptionApproveDto[] = [];
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
    private authService: AuthService,
    private attachmentService: AttachmentService, 
  ) {
    // Admin/HeadInspector müfəttiş onayını gözləyən (0) və onaylanmış (1) uyğunsuzluqları görür.
    // HeadInspector birbaşa son onay (2) verir, Admin isə hər iki onayı addım-addım verir (approveStatus)
    this.isheadInspector = this.authService.hasAnyRole(['HeadInspector', 'Admin']);
    this.isAdmin = this.authService.hasRole('Admin');
    if (this.isheadInspector) {
      this.displayedColumns.splice(this.displayedColumns.indexOf('media'), 0, 'status');
      this.displayedColumnsWithActions.splice(this.displayedColumnsWithActions.indexOf('media'), 0, 'status');
    }

    this.isInspector = this.authService.hasAnyRole(['Inspector', 'Admin']);

    this._tableService.api_url = 'disruptions/getDetails';
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = 'desc';
    this._tableState.paginator.size = this.pageSize;

    this._tableState.filter['inspectionPlanStatus'] = "4";
    this._tableState.filter['disruptionStatus'] = this.isheadInspector ? "0,1" : "0";


    const navigation = this.router.getCurrentNavigation();
    let state: any = navigation?.extras?.state;

    if (!state) {
      // Səhifə yenilənəndə router state itir — sessionStorage-dan bərpa edirik
      const saved = sessionStorage.getItem('disruption_middle_details_state');
      state = saved ? JSON.parse(saved) : null;
    }

    if (!state) {
      this.location.back();
      return;
    }

    sessionStorage.setItem('disruption_middle_details_state', JSON.stringify(state));

    this.data = state["data"];
    this.action = state["action"];
    if (this.action == false) {
      this._tableState.filter['inspectionPlanId'] = this.data.id.toString();
    } else {
      this._tableState.filter['inspectionPlanId'] = this.data.inspectionPlanId.toString();
    }
  }

  ngOnInit() {
    this.editForm = this.fb.group({
      sectionName: [{ value: '', disabled: true }, Validators.required],
      disruptionCategoryName: [{ value: '', disabled: true }, Validators.required],
      disruptionReasonId: ['', Validators.required],
      deadline: ['', Validators.required],
      description: ['', Validators.required],
      files: [[]]
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

  // Admin hər iki onayı verir: müfəttiş onayı (0→1), sonra son onay (1→2)
  approveStatus(row: DisruptionDto): number {
    if (this.isAdmin) return row.status == 0 ? 1 : 2;
    return this.isheadInspector ? 2 : 1;
  }

  changeDisruptionStatus(row: DisruptionDto, status: number) {
    this.submitStatuses([row], () => status, 'Əməliyyat uğurla tamamlandı');
  }

  changeSelectedDisruptionStatus(status: number) {
    this.submitStatuses(this.selection.selected, () => status, 'Əməliyyat uğurla tamamlandı');
  }

  // Seçilmiş sətirlərin statusu qarışıq ola bilər — hər sətir öz növbəti onay statusunu alır
  approveSelected() {
    this.submitStatuses(this.selection.selected, row => this.approveStatus(row), 'Uyğunsuzluq təstiqləndi');
  }

  private submitStatuses(rows: DisruptionDto[], statusOf: (row: DisruptionDto) => number, successMessage: string) {
    this.disruptionApproveList = rows.map(row => {
      const approve = new DisruptionApproveDto();
      approve.disruptionId.push(row.disruptionId);
      approve.status = statusOf(row);
      return approve;
    });
    if (this.disruptionApproveList.length == 0) {
      this.notify.warning('Heç bir uyğunsuzluq seçilməyib');
      return;
    }

    if (this.isSaving) return;
    this.isSaving = true;
    this.disruptionService.aprovePlan(this.disruptionApproveList)
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

  openEditDialog(disruption: DisruptionDto) {
    this.selectedDisruption = disruption;
    this.selectedDisruption.id = disruption.disruptionId;

    this.editForm.patchValue({
      sectionName: disruption.sectionName,
      disruptionCategoryName: disruption.disruptionCategoryName,
      disruptionReasonId: disruption.disruptionReasonId,
      description: disruption.description,
      files: []
    });

    this.disruptionService.getById(disruption.disruptionId).subscribe({
      next: (response: RequestResponseOne<Disruption>) => {
        if (response.success && response.data) {
          this.editForm.patchValue({ deadline: response.data.deadline ?? '' });
        }
      }
    });

    this.isEditDialogOpen = true;
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

  onEditSubmit() {
    const files: File[] = this.editForm.get('files')?.value || [];
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
        questionId: null,
        localId: ''
      };

      this.disruptionService.updateDisruption(updatedDisruption).subscribe({
        next: (response: { success: boolean }) => {
          if (response.success) {
            if (files.length > 0) {
              this.attachmentService.uploadAttachment(
                Module.Disruption,
                MediaType.Image,
                this.selectedDisruption!.disruptionId,
                files
              ).subscribe({
                next: () => this.notify.success('Şəkil uğurla yükləndi'),
                error: () => this.notify.error('Şəkil yüklənmədi')
              });
            }
            this.notify.success('Uyğunsuzluq yeniləndi');
            this.closeEditDialog();
            this.fill();
          }
        },
        error: () => {
          this.notify.error('Xəta baş verdi');
        }
      });
    }
  }
}
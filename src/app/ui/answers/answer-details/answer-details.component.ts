import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/internal/operators/finalize';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { PlanApprove } from '../../plans/plan.model';
import { TableState } from '../../../models/table-state.model';
import { Observable } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Firm } from '../../inspections/firm.model';
import { TableService } from '../../services/table.service';
import { Router } from '@angular/router';
import { InspectionsService } from '../../inspections/inspections.service';
import { DisruptionAnswerService } from '../disruption-answer.service';
import { DisruptionAnswer, DisruptionAnswerDTO } from '../disruption-answer.model';
import { CommonModule, DatePipe, NgFor, Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { NotificationService } from '../../../shared/services/notification.service';
import { MediaComponent } from '../../components/media/media.component';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { AttachmentService } from '../../../admin/services/attachment.service';

@Component({
  selector: 'app-answer-details',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, NgFor, FileUploadModule, MediaComponent, MatTooltipModule],
  providers: [DatePipe],
  templateUrl: './answer-details.component.html',
  styleUrl: './answer-details.component.scss'
})
export class AnswerDetailsComponent {

  displayedColumns: string[] = ['position', 'inspectorName', 'sectionName', 'disruptionCategoryName', 'reasonName', 'createdDate', 'note', 'internalStatus', 'returnReason', 'media', 'details'];
  public answerStatus: any[] = [
    { value: '1', viewValue: 'Həll edildi' },
    { value: '3', viewValue: 'Razı deyiləm' }
  ];
  public dataSource: DisruptionAnswerDTO[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  allDataCount: number = 0;

  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  private _tableState: TableState = new TableState();
  public pageSize: number = 10;
  public pageSizeOptions: number[] = [5, 10, 20]; // Səhifə ölçüsü seçimləri
  public isLoading: boolean = false;
  public rows$: Observable<any[]> = new Observable<any[]>();
  public data: any;
  public action: boolean = false;
  public editedAnswer: DisruptionAnswer = new DisruptionAnswer();
  /** Cavab dialoqu üçün tam sətir (rədd səbəbi və s.) */
  editedRow: DisruptionAnswerDTO | null = null;
  private searchTerm: string = "";

  editForm!: FormGroup;
  isEditDialogOpen = false;
  MediaType = MediaType;
  Module = Module;

  constructor(private inspectionsService: InspectionsService,
    private disruptionAnswerService: DisruptionAnswerService,
    private _tableService: TableService,
    private datePipe: DatePipe,
    private router: Router,
    private attachmentService: AttachmentService,
    private notify: NotificationService,
    private fb: FormBuilder,
    private location: Location,) {


    this._tableState = new TableState();
    this._tableService.api_url = "disruptionAnswers/getDetails";
    this._tableState.filter['disruptionStatus'] = "2";

    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      this.data = state["data"]; // row obyekti
      this.action = state["action"];


      this._tableState.filter['inspectionPlanId'] = this.data.inspectionPlanId.toString();

      this._tableState.filter['level'] = "1";
      this._tableState.filter['disruptionAnswerStatus'] = state["status"];
      this._tableState.filter['isCurrent'] = state["isCurrent"];

    } else {
      this.location.back();
      return;
    }
  }


  ngOnInit() {
    this.editForm = this.fb.group({
      id: [''],
      answerStatus: ['', Validators.required],
      note: ['', [Validators.required, Validators.minLength(10)]],
      files: [null, Validators.required]
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


  getRowNumber(index: number): number {
    return this.paginator ? index + 1 + (this.paginator.pageIndex * this.paginator.pageSize) : index + 1;
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





  openEditDialog(answer: DisruptionAnswerDTO) {
    this.editedAnswer = answer;
    this.editedRow = answer;
    this.editForm.patchValue({
      id: answer.id,
      note: answer.note,
      approveStatus: answer.approveStatus,
    });
    this.isEditDialogOpen = true;

  }


  closeEditDialog() {
    this.isEditDialogOpen = false;
    this.editedRow = null;
    this.editForm.reset();
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.updateValueAndValidity();
    });
  }

  onNativeFileChange(event: any) {
    const files = Array.from(event.target.files);
    this.editForm.get('files')?.setValue(files.length > 0 ? files : null);
    this.editForm.get('files')?.markAsTouched();
    this.editForm.get('files')?.updateValueAndValidity();
  }

  saveEdit() {
    const files = this.editForm.get('files')?.value || [];
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    if (this.editForm.valid && this.editedAnswer) {
      const updatedDisruption = {
        id: this.editForm.get('id')?.value,
        answerStatus: this.editForm.get('answerStatus')?.value,
        note: this.editForm.value.note,
      };

      this.disruptionAnswerService.AddDisruptionAnswer(updatedDisruption).subscribe({
        next: (response: { success: boolean }) => {
          if (response.success) {
            if (files.length > 0) {
              this.attachmentService.uploadAttachment(
                Module.DisAnswer,
                MediaType.Image,
                this.editForm.get('id')?.value,
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
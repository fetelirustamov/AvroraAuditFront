
import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/internal/operators/finalize';
import { Observable } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { NotificationService } from '../../../../shared/services/notification.service';
import { DisruptionAnswerApproveDto, DisruptionAnswerDTO } from '../../disruption-answer.model';
import { TableState } from '../../../../models/table-state.model';
import { DisruptionAnswerService } from '../../disruption-answer.service';
import { InspectionsService } from '../../../inspections/inspections.service';
import { TableService } from '../../../services/table.service';
import { Router } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { MediaComponent } from '../../../components/media/media.component';

@Component({
  selector: 'app-answer-approve-details',
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTableModule, CommonModule, MatPaginatorModule, MatProgressSpinnerModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, ReactiveFormsModule, NgxMaterialTimepickerModule, FileUploadModule, MatCheckboxModule, MediaComponent],
  providers: [DatePipe],
  templateUrl: './answer-approve-details.component.html',
  styleUrl: './answer-approve-details.component.scss'
})
export class AnswerApproveDetailsComponent {

  displayedColumns: string[] = ['select', 'position', 'inspectorName', 'sectionName', 'reasonName', 'createdDate', 'note', 'media', 'details', 'actions'];
  displayedColumnsModal: string[] = ['reasonName', 'disruptionNote', 'media', 'answeredUser', 'answerNote', 'answerMedia', 'answerStatus'];
  public answerStatus: any[] = [
    { value: '1', viewValue: 'Həll edildi' },
    { value: '3', viewValue: 'Razı deyiləm' }
  ];
  public dataSource: DisruptionAnswerDTO[] = [];
  public dataSourceModal: DisruptionAnswerDTO[] = [];

  selection = new SelectionModel<DisruptionAnswerDTO>(true, []);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

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
  private searchTerm: string = "";
  MediaType = MediaType;
  Module = Module;
  selectedDisruption: DisruptionAnswerDTO | null = null;
  private disruptionAnswerApprove: DisruptionAnswerApproveDto = new DisruptionAnswerApproveDto();
  isDetailsDialogOpen = false;

  isRejectDialogOpen = false;
  selectedRowForReject: DisruptionAnswerDTO | null = null;
  rejectNote = '';
  rejectNoteError = false;


  constructor(
    private disruptionAnswerService: DisruptionAnswerService,
    private _tableService: TableService,
    private router: Router,

    private notify: NotificationService,
    private location: Location,) {


    this._tableState = new TableState();
    this._tableService.api_url = "disruptionAnswers/getDetails";
    this._tableState.filter['disruptionStatus'] = "2";
    this._tableState.filter['disruptionAnswerStatus'] = "1";
    this._tableState.filter['isCurrent'] = "1"; // Cari olanlar

    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = "desc";
    this._tableState.paginator.size = Number(this.pageSize);
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      this.data = state["data"]; // row obyekti
      this.action = state["action"];

      this._tableState.filter['inspectionPlanId'] = this.data.inspectionPlanId.toString();

    } else {
      this.location.back();
      return;
    }
  }


  ngOnInit() {


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


  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.length;
    return numSelected === numRows;
  }


  openDetailsDialog(disruption: DisruptionAnswerDTO) {
    console.log(disruption);
    this.selectedDisruption = disruption;

    this.isDetailsDialogOpen = true;
    this.getAnswerByDisruptionId(disruption.disruptionId.toString());
    // Load reasons for the category
    //  this.loadReasons(disruption.disruptionCategoryId);
  }

  getAnswerByDisruptionId(id: string) {
    this.disruptionAnswerService.GetDisruptionAnswerByDisruptionId(id).subscribe((response) => {

      this.dataSourceModal = response.data;
      this.isDetailsDialogOpen = true;
    });
  }

  checkboxLabel(row?: DisruptionAnswerDTO): string {
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




  changeDisruptionAnswerStatus(row: DisruptionAnswerDTO, status: number) {
    this.disruptionAnswerApprove = new DisruptionAnswerApproveDto();
    this.disruptionAnswerApprove.Id = row.id;
    this.disruptionAnswerApprove.Level = row.level;
    this.disruptionAnswerApprove.confirmStatus = status;
    this.disruptionAnswerApprove.Note = row.note ?? '';
    this.disruptionAnswerApprove.answerStatus = row.approveStatus!;



    this.disruptionAnswerService.AddDisruptionAnswer(this.disruptionAnswerApprove).subscribe((data) => {
      if (data.success) {
        this.notify.success('Əməliyyat uğurla tamamlandı');
      }
      this.fill();
    });
  }

  closeDetailsDialog() {
    this.isDetailsDialogOpen = false;
  }

  openRejectDialog(row: DisruptionAnswerDTO) {
    this.selectedRowForReject = row;
    this.rejectNote = '';
    this.rejectNoteError = false;
    this.isRejectDialogOpen = true;
  }

  closeRejectDialog() {
    this.isRejectDialogOpen = false;
    this.selectedRowForReject = null;
    this.rejectNote = '';
    this.rejectNoteError = false;
  }

  confirmReject() {
    if (!this.rejectNote.trim()) {
      this.rejectNoteError = true;
      return;
    }
    if (!this.selectedRowForReject) return;

    this.disruptionAnswerApprove = new DisruptionAnswerApproveDto();
    this.disruptionAnswerApprove.Id = this.selectedRowForReject.id;
    this.disruptionAnswerApprove.Level = this.selectedRowForReject.level;
    this.disruptionAnswerApprove.confirmStatus = 2;
    this.disruptionAnswerApprove.answerStatus = this.selectedRowForReject.approveStatus!;
    this.disruptionAnswerApprove.returnReason = this.rejectNote;

    this.disruptionAnswerService.AddDisruptionAnswer(this.disruptionAnswerApprove).subscribe((data) => {
      if (data.success) {
        this.notify.success('Əməliyyat uğurla tamamlandı');
      }
      this.closeRejectDialog();
      this.fill();
    });
  }


  getStatusText(status: number): string {
    switch (status) {
      case 1:
        return 'Həll edildi';
      case 2:
        return 'Gözləmədə';
      case 3:
        return 'Razı deyiləm';
      default:
        return 'Naməlum';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 1:
        return 'badge text-outline-success';   // yaşıl
      case 2:
        return 'badge text-outline-warning';    // narıncı
      case 3:
        return 'badge text-outline-danger';   // qırmızı
      default:
        return 'badge text-outline-unknown';    // boz
    }
  }


}
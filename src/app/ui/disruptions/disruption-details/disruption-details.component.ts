import { Component, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { DisruptionDto } from '../disruption.model';
import { CommonModule, Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MediaType, Module } from '../../components/media/media-type.enum';
import { MediaComponent } from '../../components/media/media.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';

// Son onaylanmış və ya rədd olunmuş uyğunsuzluqlara yalnız baxış — onay işi Müfəttiş təsdiqi ekranındadır
@Component({
  selector: 'app-disruption-details',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatCardModule,
    MatTableModule,
    CommonModule,
    MediaComponent
  ],
  templateUrl: './disruption-details.component.html',
  styleUrl: './disruption-details.component.scss'
})
export class DisruptionDetailsComponent {

  displayedColumns: string[] = ['inspectorName', 'locationCode', 'locationName', 'createdDate', 'sectionName', 'disruptionCategoryName', 'reasonName', 'description', 'media'];
  public dataSource: DisruptionDto[] = [];
  allDataCount: number = 0;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public isLoading = false;
  public searchTerm: string = '';
  public pageSize: number = 10;
  public pageSizeOptions: number[] = [5, 10, 20]; // Səhifə ölçüsü seçimləri
  public data: any;
  public disruptionStatus: number = 0;
  private _tableState: TableState = new TableState();
  MediaType = MediaType;
  Module = Module;

  constructor(
    private _tableService: TableService,
    private router: Router,
    private location: Location,
    private notify: NotificationService
  ) {
    this._tableService.api_url = 'disruptions/getDetails';
    this._tableState.paginator.page = 0;
    this._tableState.sorting.direction = 'desc';
    this._tableState.paginator.size = this.pageSize;

    this._tableState.filter['inspectionPlanStatus'] = "4";

    const navigation = this.router.getCurrentNavigation();
    let state: any = navigation?.extras?.state;

    if (!state) {
      // Səhifə yenilənəndə router state itir — sessionStorage-dan bərpa edirik
      const saved = sessionStorage.getItem('disruption_details_state');
      state = saved ? JSON.parse(saved) : null;
    }

    if (!state) {
      this.location.back();
      return;
    }

    sessionStorage.setItem('disruption_details_state', JSON.stringify(state));

    this.data = state["data"];
    this.disruptionStatus = state["status"];
    this._tableState.filter['disruptionStatus'] = this.disruptionStatus.toString();
    this._tableState.filter['inspectionPlanId'] = this.data.inspectionPlanId.toString();
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

  onPageSizeChange(newPageSize: any) {
    this.pageSize = newPageSize;
    this._tableState.paginator.size = this.pageSize;
    if (this.paginator) {
      this.paginator.pageSize = this.pageSize;
      this.paginator.pageIndex = 0; // Səhifəni sıfırlayır
      this.fill();
    }
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
      })
    ).subscribe({
      next: (response) => {
        this._tableState.paginator.total = response.data?.total || 0;
        this.dataSource = response.data?.items || [];
        this.allDataCount = response.data?.total || 0;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'))
    });
  }
}

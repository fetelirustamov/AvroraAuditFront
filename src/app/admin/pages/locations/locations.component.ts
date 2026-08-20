import { Component, OnInit, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { LocationAddComponent } from './add/location-add.component';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { LocationService } from '../../services/location.service';
import { LocationDto } from '../../models/location.model';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { AuditLoadingOverlayComponent } from '../../../ui/components/audit-loading-overlay/audit-loading-overlay.component';

interface LocationRow {
  id?: number;
  firmId: number;
  regionId?: number;
  firmName: string;
  locationCode?: number;
  locationName: string;
  locationAddress?: string;
  locationType?: number;
  contactNumber?: string;
  responsiblePersonId?: number;
  latitude?: string;
  longitude?: string;
}

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    AdminBreadcrumbComponent,
    AuditLoadingOverlayComponent
  ],
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss'
})
export class LocationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = ['firmName', 'locationCode', 'locationName', 'contactNumber', 'latitude', 'longitude', 'actions'];
  dataSource: MatTableDataSource<LocationRow>;
  pageSize = 10;
  firms: FirmDto[] = [];
  regions: any[] = [];

  rows: LocationRow[] = [];

  isLoading = false;

  // Advanced search
  searchForm!: FormGroup;
  private searchDialogRef?: MatDialogRef<any>;
  @ViewChild('modalContent') modalContent!: TemplateRef<any>;

  constructor(
    private dialog: MatDialog,
    private firmService: FirmService,
    private fb: FormBuilder,
    private confirmDialog: ConfirmDialogService,
    private locationService: LocationService,
  ) {
    this.dataSource = new MatTableDataSource<LocationRow>([]);
    this.setupFilterPredicate();
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: LocationRow, filter: string) => {
      if (!filter) {
        return true;
      }

      let criteria: {
        firmId?: number | null;
        regionId?: number | null;
        locationCode?: string | number | null;
        locationName?: string | null;
      };

      try {
        criteria = JSON.parse(filter);
      } catch {
        return true;
      }

      const { firmId, regionId, locationCode, locationName } = criteria;

      if (firmId != null && data.firmId !== firmId) {
        return false;
      }

      if (regionId != null && data.regionId !== regionId) {
        return false;
      }

      if (locationCode != null && String(locationCode).trim() !== '') {
        const code = String(data.locationCode ?? '').toLowerCase();
        if (!code.includes(String(locationCode).trim().toLowerCase())) {
          return false;
        }
      }

      if (locationName != null && String(locationName).trim() !== '') {
        const name = (data.locationName ?? '').toLowerCase();
        if (!name.includes(String(locationName).trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    };
  }

  ngOnInit(): void {
    this.loadFirms();
    this.searchForm = this.fb.group({
      firmId: [null],
      regionId: [null],
      locationCode: [null],
      locationName: [''],
      date: [null]
    });
  }

  private loadFirms(): void {
    this.isLoading = true;
    this.firmService.getAllFirms().subscribe({
      next: (response: any) => {

        let firms: FirmDto[] = [];

        if (response && Array.isArray(response.data)) {
          firms = response.data as FirmDto[];
        } else if (Array.isArray(response)) {
          firms = response as FirmDto[];
        } else if (response?.data?.items && Array.isArray(response.data.items)) {
          firms = response.data.items as FirmDto[];
        }

        this.firms = firms;
        // Firmalar gəldikdən sonra location-ları yükləyək ki, firmName düzgün xəritələnsin
        this.loadLocations();
      },
      error: (error) => {
        console.error('Firmalar yüklənərkən xəta (locations):', error);
        this.isLoading = false;
        this.firms = [];
      }
    });
  }

  private loadLocations(): void {
    this.isLoading = true;
    this.locationService.list().subscribe({
      next: (response) => {
        if (!response || !response.data) {
          this.rows = [];
          this.dataSource.data = [];
          this.isLoading = false;
          return;
        }

        const locations = response.data as unknown as LocationDto[];
        this.rows = locations.map((loc) => ({
          id: loc.id,
          firmId: loc.firmId,
          regionId: loc.regionId ?? loc.RegionId ?? loc.regionID,
          firmName: this.resolveFirmName(loc.firmId),
          locationCode: loc.locationCode,
          locationName: loc.locationName,
          locationAddress: loc.locationAddress,
          locationType: loc.locationType,
          contactNumber: loc.contactNumber,
          responsiblePersonId: loc.responsiblePersonId,
          latitude: loc.latitude,
          longitude: loc.longitude
        }));

        this.dataSource.data = this.rows;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Location-lar yüklənərkən xəta:', error);
        this.rows = [];
        this.dataSource.data = [];
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openModal(tpl: TemplateRef<any>): void {
    this.searchDialogRef = this.dialog.open(tpl, {
      width: '400px',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'right-panel'
    });
    this.searchDialogRef.afterClosed().subscribe(() => { });
  }

  closeModal(): void {
    this.searchDialogRef?.close();
  }

  onSearchSubmit(): void {
    const criteria = this.searchForm.getRawValue();
    const hasCriteria = Object.values(criteria).some(
      (value) => value != null && String(value).trim() !== ''
    );
    this.dataSource.filter = hasCriteria ? JSON.stringify(criteria) : '';
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
    this.closeModal();
  }

  resetForm(): void {
    this.searchForm.reset();
    this.regions = [];
    this.dataSource.filter = '';
  }

  onFirmChange(firmId: number | null): void {
    this.regions = [];
    this.searchForm.patchValue({ regionId: null }, { emitEvent: false });

    if (!firmId) return;

    this.locationService.getRegionsByFirmId(firmId).subscribe({
      next: (response: any) => {
        if (response && Array.isArray(response.data)) {
          this.regions = response.data;
        } else if (Array.isArray(response)) {
          this.regions = response;
        } else {
          this.regions = [];
        }
      },
      error: (error) => {
        console.error('Regionlar yüklənərkən xəta:', error);
        this.regions = [];
      }
    });
  }

  add() {
    const dialogRef = this.dialog.open(LocationAddComponent, {
      width: '980px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog'
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.created) {
        this.loadLocations();
      }
    });
  }

  edit(row: LocationRow) {
    const dialogRef = this.dialog.open(LocationAddComponent, {
      width: '980px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'modal-like-dialog',
      data: { mode: 'edit', item: row }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.updated) {
        this.loadLocations();
      }
    });
  }

  remove(row: LocationRow) {
    this.confirmDialog.confirm({
      title: 'Məkan silinsin?',
      message: `"${row.locationName}" məkanını silmək istədiyinizə əminsiniz?`,
      confirmText: 'Bəli, sil',
      cancelText: 'Ləğv et'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      if (!row.id) {
        console.error('Silmək üçün id tapılmadı');
        return;
      }

      this.locationService.delete(row.id).subscribe({
        next: () => {
          this.loadLocations();
        },
        error: (error) => {
          console.error('Location silinərkən xəta:', error);
        }
      });
    });
  }

  private resolveFirmName(firmId: number): string {
    const firm = this.firms.find(f => f.id === firmId);
    return firm ? firm.name : '—';
  }
}

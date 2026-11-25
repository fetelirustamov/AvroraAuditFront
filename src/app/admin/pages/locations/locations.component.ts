import { AfterViewInit, Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, finalize } from 'rxjs';
import { LocationAddComponent, LocationDialogData } from './add/location-add.component';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { LocationService } from '../../services/location.service';
import { LocationDto } from '../../models/location.model';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, queryString } from '../../../shared/utils/query-state';
import { TableUrlState } from '../../shared/table-url-state';
import { MASTER_DATA_QUERY } from '../master-data/master-data-query';

const KEYS = MASTER_DATA_QUERY.locations;

interface RegionOption {
  id: number;
  name: string;
}

function regionIdOf(location: LocationDto): number | null {
  return location.regionID == null ? null : Number(location.regionID);
}

/** "Audit strukturu" səhifəsinin "Mağazalar" tabı: seçilmiş firmanın mağazaları. */
@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
    ListStateComponent
  ],
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss'
})
export class LocationsComponent implements OnInit, OnChanges, AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly locationService = inject(LocationService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) firmId!: number;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly displayedColumns = ['locationCode', 'locationName', 'region', 'contactNumber', 'coordinates', 'actions'];

  /** Bölgənin adı firmanın bölgə siyahısından: `GET /locations` yalnız regionID qaytarır */
  regionName(location: LocationDto): string {
    const id = regionIdOf(location);
    return this.regions.find(r => r.id === id)?.name ?? '—';
  }
  readonly dataSource = new MatTableDataSource<LocationDto>([]);
  readonly urlState = new TableUrlState(inject(Router), this.route, KEYS.page);
  readonly searchControl = new FormControl(queryString(this.route.snapshot.queryParamMap, KEYS.search) ?? '', { nonNullable: true });
  readonly regionControl = new FormControl<number | null>(queryNumber(this.route.snapshot.queryParamMap, KEYS.region));

  /** Bütün firmaların mağazaları (API firmaya görə süzmür). */
  private allLocations: LocationDto[] = [];
  regions: RegionOption[] = [];

  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  get hasFilters(): boolean {
    return !!this.searchControl.value.trim() || this.regionControl.value != null;
  }

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFiltersChange());
    this.regionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onFiltersChange());
    this.load();
    this.loadRegions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Firma dəyişəndə filtrlər sıfırlanır (URL-i səhifə özü təmizləyir).
    // Səhifə hadisəsiz sıfırlanır: paginator-un page hadisəsi səhifənin firma naviqasiyasını əvəz edərdi.
    if (changes['firmId'] && !changes['firmId'].firstChange) {
      this.searchControl.setValue('', { emitEvent: false });
      this.regionControl.setValue(null, { emitEvent: false });
      this.paginator.pageIndex = 0;
      this.applyFilters();
      this.loadRegions();
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  load(): void {
    this.isLoading = true;
    this.loadError = null;
    this.locationService.list()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: response => {
          this.allLocations = Array.isArray(response?.data) ? response.data : [];
          this.applyFilters();
          this.loaded = true;
          this.urlState.restorePage(this.paginator, this.dataSource.data.length);
        },
        error: err => this.loadError = apiErrorMessage(err, 'Mağazalar yüklənmədi')
      });
  }

  private loadRegions(): void {
    this.regions = [];
    this.locationService.getRegionsByFirmId(this.firmId).subscribe({
      next: response => {
        const rows: any[] = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        this.regions = rows
          .map(r => ({ id: Number(r.id ?? r.regionId ?? r.RegionId ?? r.regionID), name: r.regionName || r.name || '—' }))
          .filter(r => Number.isFinite(r.id));
      },
      error: err => this.notify.error(apiErrorMessage(err, 'Regionlar yüklənmədi'))
    });
  }

  private onFiltersChange(): void {
    this.applyFilters();
    this.paginator.firstPage();
    this.urlState.writeFilters({ [KEYS.search]: this.searchControl.value.trim(), [KEYS.region]: this.regionControl.value });
  }

  private applyFilters(): void {
    const regionId = this.regionControl.value;
    const search = this.searchControl.value.trim().toLocaleLowerCase('az');
    this.dataSource.data = this.allLocations.filter(l =>
      l.firmId === this.firmId
      && (regionId == null || regionIdOf(l) === regionId)
      && (!search
        || (l.locationName ?? '').toLocaleLowerCase('az').includes(search)
        || String(l.locationCode ?? '').includes(search)));
  }

  add(): void {
    this.openDialog({ firmId: this.firmId });
  }

  edit(row: LocationDto): void {
    this.openDialog({ firmId: row.firmId, item: row });
  }

  private openDialog(data: LocationDialogData): void {
    this.dialog.open<LocationAddComponent, LocationDialogData, boolean>(LocationAddComponent, {
      width: '980px',
      maxWidth: '95vw',
      disableClose: true,
      data
    }).afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  remove(row: LocationDto): void {
    this.confirmDialog.confirm({
      title: 'Mağaza silinsin?',
      message: 'Mağaza siyahılardan və yeni plan seçimlərindən çıxacaq. Keçmiş yoxlamaları və hesabatları qalır. '
        + 'Admin panelindən geri qaytarmaq olmur, kod isə tutulu qalır: bu kodla yeni mağaza yaratmaq olmayacaq.',
      confirmText: 'Sil',
      tone: 'danger',
      items: [`${row.locationCode ?? '—'} · ${row.locationName}`]
    }).subscribe(result => {
      if (!result || row.id == null) return;
      this.locationService.delete(row.id).subscribe({
        next: () => {
          this.notify.success('Mağaza silindi');
          this.load();
        },
        error: err => this.notify.error(apiErrorMessage(err, 'Mağaza silinmədi'))
      });
    });
  }
}

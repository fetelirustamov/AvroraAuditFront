import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { HasPermissionDirective } from '../../../auth/directives/has-permission.directive';
import { PermissionService } from '../../../auth/permission.service';
import { TableState } from '../../../models/table-state.model';
import { DisruptionTrackingService } from '../../disruptions/disruption-tracking/disruption-tracking.service';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { Location } from '../../inspections/location.model';
import { LocationInspectionPlanSummary, LocationProfileView } from './location-inspection-summary.model';
import { LocationOverviewComponent } from './location-overview/location-overview.component';
import { LocationProfileService } from './location-profile.service';
import { MiddleSectionComponent } from './middle-section/middle-section.component';

/** Mağaza profili. Firma və mağaza URL-dədir (`?firm=…&location=…`), açılışda profil avtomatik yüklənir. */
@Component({
  selector: 'app-location-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatSelectModule, MatProgressBarModule,
    PageHeaderComponent, ListStateComponent, HasPermissionDirective,
    LocationOverviewComponent, MiddleSectionComponent,
  ],
  templateUrl: './location-profile.component.html',
})
export class LocationProfileComponent implements OnInit {
  private readonly inspectionsService = inject(InspectionsService);
  private readonly locationProfileService = inject(LocationProfileService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trackingService = inject(DisruptionTrackingService);
  private readonly permissions = inject(PermissionService);

  firms: Firm[] = [];
  locations: Location[] = [];

  isLoading = false;
  loadError: string | null = null;
  profileView: LocationProfileView | null = null;
  overdue: number | null = null;
  private loadedFirmId: number | null = null;
  private overdueSub?: Subscription;

  readonly searchForm = new FormGroup({
    firmId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    locationCode: new FormControl<number | null>(null, { validators: [Validators.required] })
  });

  ngOnInit(): void {
    this.inspectionsService.getFirms().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.firms = response.data ?? [],
      error: error => this.notify.error(apiErrorMessage(error, 'Firmalar yüklənmədi')),
    });

    const q = this.route.snapshot.queryParamMap;
    const firmId = queryNumber(q, 'firm');
    const locationCode = queryNumber(q, 'location');
    if (firmId == null) return;
    this.searchForm.patchValue({ firmId, locationCode });
    this.loadLocations(firmId);
    if (locationCode != null) this.load();
  }

  private loadLocations(firmId: number): void {
    this.inspectionsService.getLocationByFirmId(firmId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.locations = response.data ?? [];
        // URL-dən açılanda profil mağaza siyahısından əvvəl gələ bilər: ad sonradan qoyulur
        if (this.profileView && !this.profileView.locationName) {
          this.profileView = { ...this.profileView, locationName: this.locationName(this.profileView.locationCode) };
        }
      },
      error: error => this.notify.error(apiErrorMessage(error, 'Mağazalar yüklənmədi')),
    });
  }

  private locationName(code: number): string {
    return this.locations.find(l => Number(l.locationCode) === code)?.locationName ?? '';
  }

  onSelectFirm(firmId: number): void {
    this.searchForm.patchValue({ locationCode: null });
    this.locations = [];
    this.loadLocations(firmId);
  }

  onSearch(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      this.notify.warning('Firma və mağaza seçin');
      return;
    }
    const { firmId, locationCode } = this.searchForm.getRawValue();
    void writeQueryState(this.router, { firm: firmId, location: locationCode });
    this.load();
  }

  load(): void {
    const code = Number(this.searchForm.controls.locationCode.value);
    const firmId = this.searchForm.controls.firmId.value;
    this.isLoading = true;
    this.loadError = null;
    this.locationProfileService.getInspectionSummaries(code).pipe(
      finalize(() => this.isLoading = false),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        const rows = res.success && Array.isArray(res.data) ? res.data : [];
        this.loadedFirmId = firmId;
        this.profileView = this.buildProfileView(code, this.locationName(code), rows);
        this.loadOverdue(firmId, code);
      },
      error: error => {
        // Köhnə mağazanın göstəriciləri xəta ilə birlikdə ekranda qalmasın
        this.profileView = null;
        this.loadError = apiErrorMessage(error, 'Mağaza profili yüklənmədi');
      }
    });
  }

  /**
   * Gecikən uyğunsuzluq sayı izləmə ekranının mərhələ saylarından gəlir: KPI-ın linki eyni siyahını açır.
   * İzləməyə icazəsi olmayan istifadəçidə sorğu getmir və KPI göstərilmir.
   */
  private loadOverdue(firmId: number | null, locationCode: number): void {
    this.overdue = null;
    this.overdueSub?.unsubscribe();
    if (!this.canTrack) return;

    const state = new TableState();
    state.paginator.size = 1;
    state.filter = { locationCode: String(locationCode), ...(firmId != null ? { firmId: String(firmId) } : {}) };
    this.overdueSub = this.trackingService.list(state).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => this.overdue = (res.data?.stages ?? []).reduce((sum, s) => sum + s.overdue, 0),
      // Say yüklənməsə KPI "—" göstərir, profilin qalanı işləyir
      error: () => this.overdue = null,
    });
  }

  get canTrack(): boolean {
    return this.permissions.canShow('disruption-tracking');
  }

  /** "Uyğunsuzluq izləmə"-də bu mağazanın uyğunsuzluqları */
  get trackingParams(): Record<string, number | null> {
    return { firm: this.loadedFirmId, location: this.profileView?.locationCode ?? null };
  }

  private buildProfileView(
    locationCode: number,
    locationName: string,
    rows: LocationInspectionPlanSummary[]
  ): LocationProfileView {
    const n = rows.length;
    const agg = rows.reduce(
      (a, x) => ({
        planSum: a.planSum + x.planResult,
        total: a.total + x.totalCount,
        solved: a.solved + x.solvedCount,
        open: a.open + x.openCount
      }),
      { planSum: 0, total: 0, solved: 0, open: 0 }
    );
    const lastInspectionDate =
      n > 0 ? rows.reduce((m, x) => (x.startDate > m ? x.startDate : m), rows[0].startDate) : null;

    return {
      locationName,
      locationCode,
      summaries: rows,
      avgPlanResult: n ? agg.planSum / n : 0,
      totalDiscrepancies: agg.total,
      solved: agg.solved,
      open: agg.open,
      lastInspectionDate
    };
  }
}

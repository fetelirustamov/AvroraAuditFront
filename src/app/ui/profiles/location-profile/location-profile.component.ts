import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, NgFor } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuditLoadingOverlayComponent } from '../../components/audit-loading-overlay/audit-loading-overlay.component';
import { LocationOverviewComponent } from './location-overview/location-overview.component';
import { MiddleSectionComponent } from './middle-section/middle-section.component';
import { InspectionsService } from '../../inspections/inspections.service';
import { finalize } from 'rxjs';
import { Firm } from '../../inspections/firm.model';
import { Location } from '../../inspections/location.model';
import { LocationProfileService } from './location-profile.service';
import { LocationInspectionPlanSummary, LocationProfileView } from './location-inspection-summary.model';

@Component({
  selector: 'app-location-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    NgFor,
    MatFormFieldModule,
    MatSelectModule,
    AuditLoadingOverlayComponent,
    LocationOverviewComponent,
    MiddleSectionComponent
  ],
  templateUrl: './location-profile.component.html',
  styleUrl: './location-profile.component.scss'
})
export class LocationProfileComponent {
  public firms: Firm[] = [];
  public locations: Location[] = [];
  public isLoading = false;
  public profileView: LocationProfileView | null = null;

  public searchForm = new FormGroup({
    firmId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    locationCode: new FormControl<number | null>(null, { validators: [Validators.required] })
  });

  constructor(
    private inspectionsService: InspectionsService,
    private locationProfileService: LocationProfileService,
  ) {
    this.getFirms();
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

  onSelectFirm(firmId: number) {
    this.searchForm.patchValue({ locationCode: null });
    this.profileView = null;
    this.getLocations(firmId);
  }

  onSearchForm() {
    if (!this.searchForm.valid) {
      return;
    }
    const code = Number(this.searchForm.value.locationCode);
    const loc = this.locations.find((l) => Number(l.locationCode) === code);
    const locationName = loc?.locationName ?? '';

    this.isLoading = true;
    this.locationProfileService.getInspectionSummaries(code).pipe(
      finalize(() => (this.isLoading = false))
    ).subscribe({
      next: (res) => {
        const rows = res.success && Array.isArray(res.data) ? res.data : [];
        this.profileView = this.buildProfileView(code, locationName, rows);
      },
      error: () => {
        this.profileView = null;
      }
    });
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

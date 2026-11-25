import { CommonModule, NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../inspections/inspections.service';
import { PlanService } from '../../plan.service';
import { InspectionPlan } from '../../../inspections/InpectionPlan.model';
import { Location } from '../../../inspections/location.model';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-plan-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatNativeDateModule,
    MatButtonModule,
    MatDatepickerModule,
    MatExpansionModule,
    NgxMaterialTimepickerModule,
    NgFor,
  ],
  templateUrl: './plan-create.component.html',
  styleUrls: ['./plan-create.component.scss']
})
export class PlanCreateComponent {
  public locations: Location[] = [];
  public filteredLocations: Location[] = [];
  public locationFilter: string = '';
  public data: any;
  public isLoading = false;
  public planForm!: FormGroup;
  /** Datepicker-də keçmiş günlər seçilmir. */
  public readonly minDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  })();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private inspectionService: InspectionsService,
    private route: ActivatedRoute,
    private planService: PlanService,
    private notify: NotificationService
  ) {
    // Form həmişə qurulmalıdır: naviqasiya tamamlanana qədər template bir dəfə render olunur
    // və [formGroup] undefined olarsa NG01052 ilə çökür.
    this.initializeForm();

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { data?: any };

    if (!state?.data) {
      this.router.navigate(["plans/add"]);
      return;
    }

    this.data = state.data;
    this.loadLocations();
  }

  private initializeForm(): void {
    this.planForm = this.fb.group({
      panels: this.fb.array([])
    });
    this.addPanel(); // Default panel
  }

  private loadLocations(): void {
    this.inspectionService
      .getLocationByFirmId(this.data.organization)
      .subscribe({
        next: (locations) => {
          this.locations = locations.data;
          this.filteredLocations = locations.data;
        },
        error: (error) => this.notify.error(apiErrorMessage(error, 'Mağaza siyahısı yüklənmədi')),
      });
  }

  onLocationFilterChange(): void {
    const term = this.locationFilter.trim().toLowerCase();
    this.filteredLocations = !term
      ? this.locations
      : this.locations.filter(l =>
        `${l.locationCode} ${l.locationName}`.toLowerCase().includes(term));
  }

  get panels(): FormArray {
    return this.planForm.get('panels') as FormArray;
  }

  createPanelFormGroup(): FormGroup {
    return this.fb.group({
      location: ['', Validators.required],
      date: [null, Validators.required],
      startTime: ['07:00', Validators.required],
      endTime: ['23:00', Validators.required]
    });
  }

  addPanel(): void {
    this.panels.push(this.createPanelFormGroup());
  }

  /** Sonuncu sətir silinmir: boş forma göndəriləndə heç bir sorğu getmir. */
  removePanel(index: number): void {
    if (this.panels.length <= 1) return;
    this.panels.removeAt(index);
  }

  createPlan(): void {
    if (this.isLoading) return;
    if (this.panels.length === 0) {
      this.notify.warning('Plan yoxdur', {
        message: 'Ən azı bir plan sətri əlavə edin.',
      });
      return;
    }
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      this.notify.warning('Forma tamamlanmayıb', {
        message: 'Zəhmət olmasa bütün məcburi sahələri doldurun.',
      });
      return;
    }

    const panels: any[] = this.planForm.value.panels;
    const plans = panels.map((formValue) => ({
      start: this.combineDateAndTimeToUTC(formValue.date, formValue.startTime),
      end: this.combineDateAndTimeToUTC(formValue.date, formValue.endTime),
      location: formValue.location
    }));

    const invalidIndex = plans.findIndex(p => p.end <= p.start);
    if (invalidIndex >= 0) {
      this.notify.warning('Vaxt düzgün deyil', {
        message: `${invalidIndex + 1}-ci planda bitmə vaxtı başlama vaxtından sonra olmalıdır.`,
      });
      return;
    }

    // Bütün panellər birlikdə göndərilir; hər birinin nəticəsi ayrıca toplanır ki, biri
    // uğursuz olanda uğurlu olanlar formadan çıxsın və təkrar cəhd dublikat yaratmasın.
    const requests = plans.map(p => this.planService.addPlan(new InspectionPlan(
      0,
      p.location,
      p.start.toISOString(),
      p.end.toISOString(),
      1,
      this.data.selected,
      "0",
      "0",
      this.data.organization,
      0,
      new Date().toISOString()
    )).pipe(
      map(() => null as string | null),
      catchError((error) => of(apiErrorMessage(error, 'Plan əlavə edilmədi.')))
    ));

    this.isLoading = true;
    forkJoin(requests)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe((errors) => {
        const failed = errors.map((message, index) => ({ message, index })).filter(e => e.message !== null);
        if (failed.length === 0) {
          this.notify.success(plans.length > 1 ? 'Planlar əlavə edildi' : 'Plan əlavə edildi', {
            message: 'Yeni plan sistemə qeydə alındı.',
          });
          this.router.navigate(['plans/add']);
          return;
        }

        // Uğurlu panelləri formadan çıxar (sondan əvvələ - indekslər sürüşməsin)
        for (let i = plans.length - 1; i >= 0; i--) {
          if (errors[i] === null) this.panels.removeAt(i);
        }
        this.notify.error(`${failed.length} plan əlavə edilmədi`, {
          message: failed.map(f => f.message).join(' '),
        });
      });
  }

  combineDateAndTimeToUTC(date: Date, time: string): Date {
    const [hours, minutes] = time.trim().split(':').map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    return combinedDate;
  }
}
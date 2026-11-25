import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { InspectionsService } from '../../../inspections/inspections.service';
import { InspectionPlan } from '../../../inspections/InpectionPlan.model';
import { Location } from '../../../inspections/location.model';
import { PlanService } from '../../plan.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { queryNumber, queryNumbers } from '../../../../shared/utils/query-state';

type PlanRowForm = FormGroup<{
  location: FormControl<string | null>;
  date: FormControl<Date | null>;
  startTime: FormControl<string>;
  endTime: FormControl<string>;
}>;

/** Seçilmiş müfəttişlər üçün plan yaradır. Firma və müfəttişlər URL-dən gəlir: `?firm=1&inspector=12&inspector=15`. */
@Component({
  selector: 'app-plan-create',
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule,
    NgxMaterialTimepickerModule, PageHeaderComponent, ListStateComponent,
  ],
  templateUrl: './plan-create.component.html',
  styleUrls: ['./plan-create.component.scss']
})
export class PlanCreateComponent implements OnInit {
  private readonly inspectionService = inject(InspectionsService);
  private readonly planService = inject(PlanService);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  firmId: number | null = null;
  inspectorCodes: number[] = [];
  /** Başlıqdakı izah: firma adı və seçilmiş müfəttişlər. */
  subtitle = '';
  backLink: UrlTree = this.router.parseUrl('/plans/add');

  locations: Location[] = [];
  filteredLocations: Location[] = [];
  locationFilter = '';
  isSaving = false;

  readonly rows = new FormArray<PlanRowForm>([]);
  readonly form = new FormGroup({ rows: this.rows });

  /** Datepicker-də keçmiş günlər seçilmir. */
  readonly minDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  })();

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.firmId = queryNumber(q, 'firm');
    this.inspectorCodes = queryNumbers(q, 'inspector');
    if (this.firmId != null) {
      this.backLink = this.router.createUrlTree(['/plans/add'], { queryParams: { firm: this.firmId } });
    }
    if (this.firmId == null || !this.hasContext) return;

    this.addRow();
    this.loadContext(this.firmId);
  }

  /** Firma və ən azı bir müfəttiş URL-də olmalıdır (müfəttiş siyahısından gəlir). */
  get hasContext(): boolean {
    return this.firmId != null && this.inspectorCodes.length > 0;
  }

  get submitLabel(): string {
    return this.rows.length > 1 ? `${this.rows.length} plan yarat` : 'Plan yarat';
  }

  onLocationFilterChange(): void {
    const term = this.locationFilter.trim().toLowerCase();
    this.filteredLocations = !term
      ? this.locations
      : this.locations.filter(l => `${l.locationCode} ${l.locationName}`.toLowerCase().includes(term));
  }

  addRow(): void {
    this.rows.push(new FormGroup({
      location: new FormControl<string | null>(null, Validators.required),
      date: new FormControl<Date | null>(null, Validators.required),
      startTime: new FormControl('07:00', { nonNullable: true, validators: Validators.required }),
      endTime: new FormControl('23:00', { nonNullable: true, validators: Validators.required }),
    }));
  }

  /** Sonuncu sətir silinmir: boş forma göndəriləndə heç bir sorğu getmir. */
  removeRow(index: number): void {
    if (this.rows.length <= 1) return;
    this.rows.removeAt(index);
  }

  createPlans(): void {
    if (this.isSaving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Forma tamamlanmayıb', { message: 'Bütün məcburi sahələri doldurun.' });
      return;
    }

    const plans = this.rows.getRawValue().map(row => ({
      start: this.combineDateAndTime(row.date!, row.startTime),
      end: this.combineDateAndTime(row.date!, row.endTime),
      location: row.location!,
    }));

    const invalidIndex = plans.findIndex(p => p.end <= p.start);
    if (invalidIndex >= 0) {
      this.notify.warning('Vaxt düzgün deyil', {
        message: `${invalidIndex + 1}-ci planda bitmə vaxtı başlama vaxtından sonra olmalıdır.`,
      });
      return;
    }

    // Bütün planlar birlikdə göndərilir; hər birinin nəticəsi ayrıca toplanır ki, biri
    // uğursuz olanda uğurlu olanlar formadan çıxsın və təkrar cəhd dublikat yaratmasın.
    const requests = plans.map(p => this.planService.addPlan(new InspectionPlan(
      0,
      p.location,
      p.start.toISOString(),
      p.end.toISOString(),
      1,
      this.inspectorCodes,
      "0",
      "0",
      this.firmId!,
      0,
      new Date().toISOString()
    )).pipe(
      map(() => null as string | null),
      catchError((error) => of(apiErrorMessage(error, 'Plan əlavə edilmədi.')))
    ));

    this.isSaving = true;
    forkJoin(requests)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe((errors) => {
        const failed = errors.filter((message): message is string => message !== null);
        if (failed.length === 0) {
          this.notify.success(plans.length > 1 ? 'Planlar yaradıldı' : 'Plan yaradıldı');
          this.router.navigateByUrl(this.backLink);
          return;
        }

        // Uğurlu sətirləri formadan çıxar (sondan əvvələ - indekslər sürüşməsin)
        for (let i = plans.length - 1; i >= 0; i--) {
          if (errors[i] === null) this.rows.removeAt(i);
        }
        this.notify.error(`${failed.length} plan yaradılmadı`, { message: failed.join(' ') });
      });
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.trim().split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

  /** Mağazalar seçim üçün, firma və müfəttiş adları başlıq üçün. */
  private loadContext(firmId: number): void {
    this.inspectionService.getLocationByFirmId(firmId).subscribe({
      next: (response) => {
        this.locations = response.data ?? [];
        this.filteredLocations = this.locations;
      },
      error: (error) => this.notify.error(apiErrorMessage(error, 'Mağaza siyahısı yüklənmədi')),
    });

    forkJoin({
      firms: this.inspectionService.getFirms().pipe(map(r => r.data ?? []), catchError(() => of([]))),
      inspectors: this.planService.getInspectors(firmId).pipe(map(r => r.data ?? []), catchError(() => of([]))),
    }).subscribe(({ firms, inspectors }) => {
      const firmName = firms.find(f => f.id === firmId)?.name;
      const names = inspectors
        .filter(user => this.inspectorCodes.includes(user.userCode))
        .map(user => `${user.name} ${user.surName}`.trim());
      const who = names.length ? names.join(', ') : `${this.inspectorCodes.length} müfəttiş`;
      this.subtitle = [firmName, who].filter(Boolean).join(' · ');
    });
  }
}

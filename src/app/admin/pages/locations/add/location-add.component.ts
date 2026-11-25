import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, catchError, finalize, map, of, switchMap } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { MapPickerComponent } from '../map-picker/map-picker.component';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';
import { LocationService } from '../../../services/location.service';
import { LocationDto } from '../../../models/location.model';
import { SectionService } from '../../../services/section.service';
import { SectionDto } from '../../../models/section.model';

/** Yeni mağaza seçilmiş firmada yaranır; `item` verilsə redaktə. */
export interface LocationDialogData {
    firmId: number;
    item?: LocationDto;
}

interface RegionOption {
    id: number;
    name: string;
}

const DEFAULT_LAT = 40.4093; // Bakı
const DEFAULT_LNG = 49.8671;

function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

/**
 * Mağaza forması (dialoq). Nəticə: saxlanılıbsa `true`.
 * Mağaza saxlanandan sonra şöbə təyinatı ayrıca sorğu ilə yazılır (LocationSections mağaza koduna bağlıdır).
 */
@Component({
    selector: 'app-location-add',
    standalone: true,
    imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MapPickerComponent],
    templateUrl: './location-add.component.html',
    styleUrl: './location-add.component.scss'
})
export class LocationAddComponent implements OnInit {
    private readonly notify = inject(NotificationService);
    private readonly firmService = inject(FirmService);
    private readonly locationService = inject(LocationService);
    private readonly sectionService = inject(SectionService);
    private readonly dialogRef = inject<MatDialogRef<LocationAddComponent, boolean>>(MatDialogRef);
    private readonly data = inject<LocationDialogData>(MAT_DIALOG_DATA);
    private readonly item = this.data.item;

    readonly isEdit = !!this.item;
    firms: FirmDto[] = [];
    regions: RegionOption[] = [];
    sections: SectionDto[] = [];
    isSaving = false;
    regionsLoading = false;
    regionsFailed = false;
    sectionsLoading = false;
    sectionsFailed = false;

    readonly initialLat = this.coordinate(this.item?.latitude, DEFAULT_LAT);
    readonly initialLng = this.coordinate(this.item?.longitude, DEFAULT_LNG);

    readonly form = inject(FormBuilder).group({
        firmId: [this.data.firmId as number | null, Validators.required],
        // Region məcburi deyil: region təyin olunmamış mağazalar da yaradıla bilər
        regionId: [toNullableNumber(this.item?.regionId ?? this.item?.RegionId ?? this.item?.regionID)],
        // Kod sistemin açarıdır (planlar, zəncir, şöbələr): məcburi, unikal, redaktədə dəyişmir
        locationCode: [
            { value: toNullableNumber(this.item?.locationCode), disabled: this.isEdit },
            [Validators.required, Validators.min(1)]
        ],
        locationName: [this.item?.locationName ?? '', Validators.required],
        locationAddress: [this.item?.locationAddress ?? ''],
        contactNumber: [this.item?.contactNumber ?? ''],
        latitude: [this.item?.latitude ?? ''],
        longitude: [this.item?.longitude ?? ''],
        radius: [toNullableNumber(this.item?.radius)]
    });

    readonly sectionsControl = new FormControl<number[]>([], { nonNullable: true });

    /**
     * Şöbə təyinatı yazıla bilərmi. Redaktədə mövcud təyinatlar oxunmayıbsa false qalır:
     * əks halda boş siyahı göndərilib mağazanın mövcud şöbələri silinərdi.
     */
    private sectionAssignmentReady = !this.isEdit;

    get regionEmptyMessage(): string {
        if (this.regionsLoading) return 'Regionlar yüklənir…';
        if (this.regionsFailed) return 'Regionlar yüklənmədi';
        return 'Bu firmada region yoxdur';
    }

    get sectionEmptyMessage(): string {
        if (this.sectionsLoading) return 'Şöbələr yüklənir…';
        if (this.sectionsFailed) return 'Şöbələr yüklənmədi';
        return 'Bu firmada şöbə yoxdur';
    }

    ngOnInit(): void {
        this.firmService.getAllFirms().subscribe({
            next: response => this.firms = Array.isArray(response?.data) ? response.data : [],
            error: err => this.notify.error(apiErrorMessage(err, 'Firmalar yüklənmədi'))
        });

        // Dialoq firma konteksti ilə açılır: "firma dəyişdi" hadisəsi olmur, asılı siyahılar burada yüklənir
        const firmId = this.form.controls.firmId.value;
        if (firmId == null) return;
        this.loadRegions(firmId);
        this.loadSections(firmId);

        const locationCode = toNullableNumber(this.item?.locationCode);
        if (this.isEdit && locationCode != null && locationCode > 0) {
            this.loadAssignedSections(firmId, locationCode);
        }
    }

    onFirmChange(firmId: number | null): void {
        this.form.controls.regionId.setValue(null);
        this.sectionsControl.setValue([]);
        this.regions = [];
        this.sections = [];
        if (firmId == null) return;
        this.loadRegions(firmId);
        this.loadSections(firmId);
    }

    private loadSections(firmId: number): void {
        this.sectionsLoading = true;
        this.sectionsFailed = false;
        this.sectionService.getByFirmId(firmId)
            .pipe(finalize(() => this.sectionsLoading = false))
            .subscribe({
                // Firmanın şöbəsi yoxdursa API 204 qaytarır: gövdə boşdur
                next: response => this.sections = Array.isArray(response?.data) ? response.data : [],
                error: () => {
                    this.sectionsFailed = true;
                    this.sections = [];
                }
            });
    }

    /** Redaktədə mağazaya artıq təyin olunmuş şöbələri seçili gətirir. */
    private loadAssignedSections(firmId: number, locationCode: number): void {
        this.locationService.getSectionsByLocationCode(locationCode, firmId).subscribe({
            next: response => {
                const rows: any[] = Array.isArray(response?.data?.items)
                    ? response.data.items
                    : (Array.isArray(response?.data) ? response.data : []);
                this.sectionsControl.setValue(rows
                    .map(r => toNullableNumber(r.id))
                    .filter((id): id is number => id != null));
                this.sectionAssignmentReady = true;
            },
            error: () => this.sectionsFailed = true
        });
    }

    private loadRegions(firmId: number): void {
        this.regionsLoading = true;
        this.regionsFailed = false;
        this.locationService.getRegionsByFirmId(firmId)
            .pipe(finalize(() => this.regionsLoading = false))
            .subscribe({
                next: response => {
                    const rows: any[] = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
                    this.regions = rows
                        .map(r => ({ id: toNullableNumber(r.id ?? r.regionId ?? r.RegionId ?? r.regionID), name: r.regionName || r.name || '—' }))
                        .filter((r): r is RegionOption => r.id != null);
                },
                error: () => {
                    this.regionsFailed = true;
                    this.regions = [];
                }
            });
    }

    onPickCoord(e: { lat: number; lng: number }): void {
        this.form.patchValue({ latitude: e.lat.toFixed(6), longitude: e.lng.toFixed(6) });
    }

    submit(): void {
        if (this.isSaving) return;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const raw = this.form.getRawValue();
        const locationCode = toNullableNumber(raw.locationCode);
        // Backend int sahələrə null qəbul etmir. Region seçilməyəndə 0 gedir: "region təyin olunmayıb"
        const payload = {
            ...raw,
            firmId: raw.firmId!,
            locationCode: locationCode!,
            locationName: (raw.locationName ?? '').trim(),
            locationAddress: raw.locationAddress ?? '',
            contactNumber: raw.contactNumber ?? '',
            latitude: raw.latitude ?? '',
            longitude: raw.longitude ?? '',
            radius: toNullableNumber(raw.radius) ?? 0,
            regionId: raw.regionId ?? 0
        };
        const sectionIds = this.sectionsControl.value;

        this.isSaving = true;

        if (this.item?.id != null) {
            // Formda olmayan sahələr olduğu kimi qayıdır (undefined JSON-a düşmür)
            const updatePayload: LocationDto = {
                ...payload,
                id: this.item.id,
                locationType: this.item.locationType,
                responsiblePersonId: this.item.responsiblePersonId
            };
            // Təyinatlar oxunmayıbsa yazılmır: boş siyahı mövcud şöbələri silərdi
            const assignCode = this.sectionAssignmentReady ? locationCode : null;
            this.locationService.update(updatePayload).pipe(
                switchMap(() => this.assignSections(assignCode, sectionIds)),
                finalize(() => this.isSaving = false)
            ).subscribe({
                next: assigned => {
                    if (assigned === false || (assigned === null && sectionIds.length > 0)) {
                        this.notify.warning('Mağaza yeniləndi, şöbə təyinatı saxlanmadı', {
                            message: 'Mağazanın mövcud şöbələri oxunmadı. Dialoqu yenidən açıb şöbələri yoxlayın.'
                        });
                    } else {
                        this.notify.success('Mağaza yeniləndi');
                    }
                    this.dialogRef.close(true);
                },
                error: err => this.notify.error(apiErrorMessage(err, 'Mağaza yenilənmədi'))
            });
            return;
        }

        this.locationService.create(payload).pipe(
            switchMap(() => this.assignSections(sectionIds.length ? locationCode : null, sectionIds)),
            finalize(() => this.isSaving = false)
        ).subscribe({
            next: assigned => {
                if (assigned === false) {
                    this.notify.warning('Mağaza əlavə edildi, şöbələr təyin edilmədi', {
                        message: 'Mağazanı redaktə edib şöbələri yenidən seçin.'
                    });
                } else {
                    this.notify.success('Mağaza əlavə edildi');
                }
                this.dialogRef.close(true);
            },
            // 409: kod artıq istifadə olunub (silinmiş mağaza daxil)
            error: err => this.notify.error(apiErrorMessage(err, 'Mağaza əlavə edilmədi'))
        });
    }

    /** Nəticə: `null` yazılmadı, `true` uğurlu, `false` uğursuz (mağaza artıq saxlanıb). */
    private assignSections(locationCode: number | null, sectionIds: number[]): Observable<boolean | null> {
        if (locationCode == null) return of(null);
        return this.locationService.assignSections({ locationCode, sectionIds }).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    private coordinate(value: string | undefined, fallback: number): number {
        const n = parseFloat(value ?? '');
        return Number.isNaN(n) ? fallback : n;
    }

    cancel(): void {
        this.dialogRef.close(false);
    }
}

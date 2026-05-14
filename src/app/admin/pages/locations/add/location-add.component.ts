import { Component, Inject, Optional, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MapPickerComponent } from '../map-picker/map-picker.component';
import { FirmService } from '../../../services/firm.service';
import { FirmDto } from '../../../models/firm.model';
import { LocationService } from '../../../services/location.service';
import { LocationDto } from '../../../models/location.model';
import { SectionService } from '../../../services/section.service';
import { SectionDto } from '../../../models/section.model';

interface LocationPayload {
    firmId: number;
    regionId?: number;
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
    selector: 'app-location-add',
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
        MapPickerComponent
    ],
    templateUrl: './location-add.component.html',
    styleUrl: './location-add.component.scss'
})
export class LocationAddComponent implements OnInit {
    form!: FormGroup;
    firms: FirmDto[] = [];
    regions: any[] = [];
    sections: SectionDto[] = [];
    selectedSectionIds: number[] = [];
    pageTitle = 'Yeni mağaza/location';
    isEditMode = false;
    initialLat: number = 40.4093;
    initialLng: number = 49.8671;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private firmService: FirmService,
        private locationService: LocationService,
        private sectionService: SectionService,
        @Optional() private dialogRef?: MatDialogRef<LocationAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: { mode?: 'edit'; item?: LocationDto }
    ) {
        this.form = this.fb.group({
            firmId: [null, Validators.required],
            regionId: [null, Validators.required],
            locationCode: [null],
            locationName: ['', Validators.required],
            locationAddress: [''],
            locationType: [null],
            contactNumber: [''],
            responsiblePersonId: [null],
            latitude: [''],
            longitude: ['']
        });

        if (data?.item) {
            this.isEditMode = true;
            this.pageTitle = 'Mağaza/location redaktə et';
            this.form.patchValue({
                ...data.item,
                regionId: this.toNullableNumber(data.item.regionId ?? data.item.RegionId ?? data.item.regionID ?? null)
            } as LocationDto);

            const lat = parseFloat(data.item.latitude as string);
            const lng = parseFloat(data.item.longitude as string);
            if (!isNaN(lat)) this.initialLat = lat;
            if (!isNaN(lng)) this.initialLng = lng;
        }
    }

    ngOnInit(): void {
        this.loadFirms();
    }

    private loadFirms(): void {
        this.firmService.getAllFirms().subscribe({
            next: (response: any) => {
                console.log('Firmalar cavabı (location-add):', response);

                let firms: FirmDto[] = [];

                // 1) RequestResponse<FirmDto>
                if (response && Array.isArray(response.data)) {
                    firms = response.data as FirmDto[];
                }
                // 2) Sadə array
                else if (Array.isArray(response)) {
                    firms = response as FirmDto[];
                }
                // 3) TableResponseData<{ items: FirmDto[] }>
                else if (response?.data?.items && Array.isArray(response.data.items)) {
                    firms = response.data.items as FirmDto[];
                }

                this.firms = firms;
                const selectedFirmId = this.form.get('firmId')?.value as number | null;
                if (selectedFirmId) {
                    this.loadRegionsByFirmId(selectedFirmId);
                }
            },
            error: (error) => {
                console.error('Firmalar yüklənərkən xəta (location-add):', error);
                this.firms = [];
            }
        });
    }

    onFirmChange(firmId: number | null): void {
        this.form.patchValue({ regionId: null }, { emitEvent: false });
        this.regions = [];
        this.sections = [];
        this.selectedSectionIds = [];

        if (!firmId) return;
        this.loadRegionsByFirmId(firmId);
        this.loadSectionsByFirmId(firmId);
    }

    private loadSectionsByFirmId(firmId: number): void {
        this.sectionService.getByFirmId(firmId).subscribe({
            next: (response: any) => {
                if (response && Array.isArray(response.data)) {
                    this.sections = response.data as SectionDto[];
                } else if (Array.isArray(response)) {
                    this.sections = response as SectionDto[];
                } else {
                    this.sections = [];
                }
            },
            error: () => { this.sections = []; }
        });
    }

    private loadRegionsByFirmId(firmId: number): void {
        this.locationService.getRegionsByFirmId(firmId).subscribe({
            next: (response: any) => {
                const currentRegionId = this.toNullableNumber(this.form.get('regionId')?.value);

                if (response && Array.isArray(response.data)) {
                    this.regions = response.data.map((r: any) => ({
                        ...r,
                        id: this.toNullableNumber(r.id ?? r.regionId ?? r.RegionId ?? r.regionID)
                    }));
                } else if (Array.isArray(response)) {
                    this.regions = response.map((r: any) => ({
                        ...r,
                        id: this.toNullableNumber(r.id ?? r.regionId ?? r.RegionId ?? r.regionID)
                    }));
                } else {
                    this.regions = [];
                }

                if (currentRegionId != null) {
                    this.form.patchValue({ regionId: currentRegionId }, { emitEvent: false });
                }
            },
            error: (error) => {
                console.error('Regionlar yüklənərkən xəta (location-add):', error);
                this.regions = [];
            }
        });
    }

    compareNumericIds = (a: any, b: any): boolean =>
        this.toNullableNumber(a) === this.toNullableNumber(b);

    private toNullableNumber(value: any): number | null {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        return Number.isNaN(n) ? null : n;
    }

    onPickCoord(e: { lat: number; lng: number }) {
        this.form.patchValue({ latitude: e.lat.toFixed(6), longitude: e.lng.toFixed(6) });
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
            return;
        }
        const raw: LocationPayload = this.form.getRawValue();

        // Backend-də int sahələrə null göndərmək xətaya səbəb olur, null-ları çıxarırıq
        const payload: any = { ...raw };
        if (payload.locationType == null) {
            delete payload.locationType;
        }
        if (payload.responsiblePersonId == null) {
            delete payload.responsiblePersonId;
        }

        // Edit mode
        if (this.isEditMode && this.data?.item?.id) {
            const id = this.data.item.id as number;
            const updatePayload: LocationDto = { ...this.data.item, ...payload, id };

            this.locationService.update(updatePayload).subscribe({
                next: (res) => {
                    this.notify.success('Mağaza/location uğurla redaktə edildi');
                    if (this.dialogRef) {
                        this.dialogRef.close({ updated: true, data: res });
                    } else {
                        this.router.navigate(['/admin/locations']);
                    }
                }
            });
            return;
        }

        // Create mode
        this.locationService.create(payload).subscribe({
            next: (res) => {
                const dataItem = Array.isArray(res?.data) ? res.data[0] : (res?.data as any);
                const locationCode = dataItem?.locationCode ?? (res as any)?.locationCode ?? payload.locationCode;

                if (this.selectedSectionIds.length > 0 && locationCode != null) {
                    this.locationService.assignSections({ locationCode: Number(locationCode), sectionIds: this.selectedSectionIds }).subscribe({
                        next: () => {
                            this.notify.success('Mağaza/location uğurla əlavə edildi');
                            if (this.dialogRef) {
                                this.dialogRef.close({ created: true, data: res });
                            } else {
                                this.router.navigate(['/admin/locations']);
                            }
                        },
                        error: () => {
                            this.notify.warning('Location yaradıldı, lakin şöbələr assign edilmədi');
                            if (this.dialogRef) {
                                this.dialogRef.close({ created: true, data: res });
                            } else {
                                this.router.navigate(['/admin/locations']);
                            }
                        }
                    });
                } else {
                    this.notify.success('Mağaza/location uğurla əlavə edildi');
                    if (this.dialogRef) {
                        this.dialogRef.close({ created: true, data: res });
                    } else {
                        this.router.navigate(['/admin/locations']);
                    }
                }
            }
        });
    }

    cancel(): void {
        if (this.dialogRef) this.dialogRef.close();
        else this.router.navigate(['/admin/locations']);
    }
} 
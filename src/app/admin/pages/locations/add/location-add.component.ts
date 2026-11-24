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
    radius?: number;
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
    regionsLoading = false;
    regionsFailed = false;
    sectionsLoading = false;
    sectionsFailed = false;
    /**
     * Şöbə təyinatının yazıla biləcəyini bildirir. Redaktədə mövcud təyinatlar
     * oxunmayıbsa false qalır - əks halda saxlama zamanı boş siyahı göndərilib
     * mağazanın mövcud şöbələri silinərdi.
     */
    private sectionAssignmentReady = false;

    // Region select-i boş qaldıqda səbəbi göstərir
    get regionEmptyMessage(): string {
        if (this.regionsLoading) return 'Regionlar yüklənir...';
        if (this.regionsFailed) return 'Regionlar yüklənmədi (server xətası)';
        return 'Bu firma üçün region təyin olunmayıb';
    }

    // Şöbə select-i boş qaldıqda səbəbi göstərir
    get sectionEmptyMessage(): string {
        if (this.sectionsLoading) return 'Şöbələr yüklənir...';
        if (this.sectionsFailed) return 'Şöbələr yüklənmədi (server xətası)';
        return 'Bu firma üçün şöbə təyin olunmayıb';
    }

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private firmService: FirmService,
        private locationService: LocationService,
        private sectionService: SectionService,
        @Optional() private dialogRef?: MatDialogRef<LocationAddComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data?: { mode?: 'edit'; item?: LocationDto; firmId?: number }
    ) {
        this.form = this.fb.group({
            firmId: [null, Validators.required],
            // Region məcburi deyil - region təyin olunmamış mağazalar da yaradıla bilər
            regionId: [null],
            locationCode: [null],
            locationName: ['', Validators.required],
            locationAddress: [''],
            locationType: [null],
            contactNumber: [''],
            responsiblePersonId: [null],
            latitude: [''],
            longitude: [''],
            radius: [null]
        });

        if (data?.item) {
            this.isEditMode = true;
            this.pageTitle = 'Mağaza/location redaktə et';
            this.form.patchValue({
                ...data.item,
                regionId: this.toNullableNumber(data.item.regionId ?? data.item.RegionId ?? data.item.regionID ?? null),
                radius: this.toNullableNumber(data.item.radius)
            } as LocationDto);

            const lat = parseFloat(data.item.latitude as string);
            const lng = parseFloat(data.item.longitude as string);
            if (!isNaN(lat)) this.initialLat = lat;
            if (!isNaN(lng)) this.initialLng = lng;
        } else if (data?.firmId) {
            // "Audit Strukturu" səhifəsindən firma konteksti ilə açılıb - firma sahəsini əvvəlcədən doldur
            this.form.patchValue({ firmId: data.firmId });
        }

        // Yaratmada silinəcək mövcud təyinat yoxdur
        this.sectionAssignmentReady = !this.isEditMode;
    }

    ngOnInit(): void {
        this.loadFirms();

        // Dialoq firma konteksti ilə (Audit Strukturu) və ya redaktə rejimində açılanda
        // "firma dəyişdi" hadisəsi baş vermir - asılı siyahıları burada özümüz yükləyirik
        const firmId = this.toNullableNumber(this.form.get('firmId')?.value);
        if (firmId == null) return;

        this.loadRegionsByFirmId(firmId);
        this.loadSectionsByFirmId(firmId);

        if (this.isEditMode) {
            const locationCode = this.toNullableNumber(this.form.get('locationCode')?.value);
            if (locationCode != null && locationCode > 0) {
                this.loadAssignedSections(firmId, locationCode);
            }
        }
    }

    private loadFirms(): void {
        this.firmService.getAllFirms().subscribe({
            next: (response: any) => {

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
        this.regionsFailed = false;
        this.sectionsFailed = false;

        if (!firmId) return;
        this.loadRegionsByFirmId(firmId);
        this.loadSectionsByFirmId(firmId);
    }

    private loadSectionsByFirmId(firmId: number): void {
        this.sectionsLoading = true;
        this.sectionsFailed = false;
        this.sectionService.getByFirmId(firmId).subscribe({
            next: (response: any) => {
                this.sectionsLoading = false;
                if (response && Array.isArray(response.data)) {
                    this.sections = response.data as SectionDto[];
                } else if (Array.isArray(response)) {
                    this.sections = response as SectionDto[];
                } else {
                    // Firmanın şöbəsi olmadıqda API 204 No Content qaytarır - gövdə boş gəlir
                    this.sections = [];
                }
            },
            error: (error) => {
                console.error('Şöbələr yüklənərkən xəta (location-add):', error);
                this.sectionsLoading = false;
                this.sectionsFailed = true;
                this.sections = [];
            }
        });
    }

    /** Redaktədə mağazaya artıq təyin olunmuş şöbələri seçili gətirir */
    private loadAssignedSections(firmId: number, locationCode: number): void {
        this.locationService.getSectionsByLocationCode(locationCode, firmId).subscribe({
            next: (response: any) => {
                const rows: any[] = Array.isArray(response?.data?.items)
                    ? response.data.items
                    : (Array.isArray(response?.data) ? response.data : []);

                this.selectedSectionIds = rows
                    .map(r => this.toNullableNumber(r.id))
                    .filter((id): id is number => id != null);
                this.sectionAssignmentReady = true;
            },
            error: (error) => {
                console.error('Mağazanın şöbələri yüklənərkən xəta (location-add):', error);
                this.selectedSectionIds = [];
                this.sectionsFailed = true;
            }
        });
    }

    private loadRegionsByFirmId(firmId: number): void {
        this.regionsLoading = true;
        this.regionsFailed = false;
        this.locationService.getRegionsByFirmId(firmId).subscribe({
            next: (response: any) => {
                this.regionsLoading = false;
                const currentRegionId = this.toNullableNumber(this.form.get('regionId')?.value);
                const rows: any[] = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);

                this.regions = rows.map((r: any) => ({
                    ...r,
                    id: this.toNullableNumber(r.id ?? r.regionId ?? r.RegionId ?? r.regionID)
                }));

                if (currentRegionId != null && this.regions.some(r => this.toNullableNumber(r.id) === currentRegionId)) {
                    this.form.patchValue({ regionId: currentRegionId }, { emitEvent: false });
                }
            },
            error: (error) => {
                console.error('Regionlar yüklənərkən xəta (location-add):', error);
                this.regionsLoading = false;
                this.regionsFailed = true;
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

        // Backend-də int sahələrə null göndərmək xətaya səbəb olur, null-ları çıxarırıq.
        // Region seçilməyəndə 0 gedir - bazada "region təyin olunmayıb" mənasını daşıyır.
        const payload: any = {
            ...raw,
            radius: this.toNullableNumber(raw.radius) ?? 0,
            regionId: this.toNullableNumber(raw.regionId) ?? 0
        };
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
                    const locationCode = this.toNullableNumber(payload.locationCode);
                    // Təyinatlar oxunmayıbsa yazmırıq - boş siyahı mövcud şöbələri silərdi
                    const canAssign = this.sectionAssignmentReady && locationCode != null && locationCode > 0;

                    if (!canAssign) {
                        if (this.selectedSectionIds.length > 0) {
                            this.notify.warning('Mağaza yeniləndi, lakin şöbə təyinatı saxlanılmadı', {
                                message: 'Mövcud təyinatlar oxunmadı və ya "Məkan Kodu" boşdur.'
                            });
                        } else {
                            this.notify.success('Mağaza/location uğurla redaktə edildi');
                        }
                        this.finishEdit(res);
                        return;
                    }

                    this.locationService.assignSections({ locationCode, sectionIds: this.selectedSectionIds }).subscribe({
                        next: () => {
                            this.notify.success('Mağaza/location uğurla redaktə edildi');
                            this.finishEdit(res);
                        },
                        error: () => {
                            this.notify.warning('Mağaza yeniləndi, lakin şöbə təyinatı saxlanılmadı');
                            this.finishEdit(res);
                        }
                    });
                }
            });
            return;
        }

        // Create mode
        this.locationService.create(payload).subscribe({
            next: (res) => {
                // Şöbə təyinatı LocationSections cədvəlində məkan koduna bağlıdır
                const locationCode = this.toNullableNumber(payload.locationCode);

                if (this.selectedSectionIds.length === 0) {
                    this.notify.success('Mağaza/location uğurla əlavə edildi');
                    this.finishCreate(res);
                    return;
                }

                if (locationCode == null || locationCode <= 0) {
                    this.notify.warning('Mağaza yaradıldı, lakin şöbələr təyin edilmədi', {
                        message: 'Şöbə təyinatı üçün "Məkan Kodu" doldurulmalıdır.'
                    });
                    this.finishCreate(res);
                    return;
                }

                this.locationService.assignSections({ locationCode, sectionIds: this.selectedSectionIds }).subscribe({
                    next: () => {
                        this.notify.success('Mağaza/location uğurla əlavə edildi');
                        this.finishCreate(res);
                    },
                    error: () => {
                        this.notify.warning('Mağaza yaradıldı, lakin şöbələr təyin edilmədi');
                        this.finishCreate(res);
                    }
                });
            }
        });
    }

    private finishCreate(res: any): void {
        if (this.dialogRef) {
            this.dialogRef.close({ created: true, data: res });
        } else {
            this.router.navigate(['/admin/locations']);
        }
    }

    private finishEdit(res: any): void {
        if (this.dialogRef) {
            this.dialogRef.close({ updated: true, data: res });
        } else {
            this.router.navigate(['/admin/locations']);
        }
    }

    cancel(): void {
        if (this.dialogRef) this.dialogRef.close();
        else this.router.navigate(['/admin/locations']);
    }
} 
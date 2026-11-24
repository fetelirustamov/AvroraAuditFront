import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { SectionsComponent } from '../sections/sections.component';
import { CategoriesComponent } from '../categories/categories.component';
import { LocationsComponent } from '../locations/locations.component';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';
import { NotificationService } from '../../../shared/services/notification.service';

/**
 * "Audit Strukturu" - Firma / Mağaza / Şöbə / Kateqoriya konsolidasiya səhifəsi.
 * Əvvəllər ayrı-ayrı naviqasiya elementləri olan Şöbələr, Kateqoriyalar və Mağazalar
 * indi burada bir Firma konteksti altında birləşdirilib. Suallar (kateqoriyaya bağlı,
 * öz cavab variantları olan daha geniş bir iş axını olduğu üçün) ayrıca səhifə olaraq qalır.
 */
@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    AdminBreadcrumbComponent,
    SectionsComponent,
    CategoriesComponent,
    LocationsComponent
  ],
  templateUrl: './master-data.component.html',
  styleUrl: './master-data.component.scss'
})
export class MasterDataComponent implements OnInit {
  firms: FirmDto[] = [];
  selectedFirmId: number | null = null;
  isLoadingFirms = false;

  constructor(
    private firmService: FirmService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadFirms();
  }

  private loadFirms(): void {
    this.isLoadingFirms = true;
    this.firmService.getAllFirms().subscribe({
      next: (response) => {
        this.firms = Array.isArray(response?.data) ? response.data : [];
        if (this.firms.length > 0 && this.selectedFirmId == null) {
          this.selectedFirmId = this.firms[0].id;
        }
        this.isLoadingFirms = false;
      },
      error: () => {
        this.firms = [];
        this.isLoadingFirms = false;
        this.notify.error('Firmalar yüklənmədi', { message: 'Serverlə əlaqədə xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' });
      }
    });
  }

  onFirmChange(): void {
    // @Input firmId dəyişikliyi ngOnChanges vasitəsilə alt komponentlərə ötürülür.
  }
}

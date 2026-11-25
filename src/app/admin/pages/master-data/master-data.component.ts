import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { queryNumber, writeQueryState } from '../../../shared/utils/query-state';
import { SectionsComponent } from '../sections/sections.component';
import { CategoriesComponent } from '../categories/categories.component';
import { LocationsComponent } from '../locations/locations.component';
import { MASTER_DATA_TAB_RESET } from './master-data-query';
import { FirmService } from '../../services/firm.service';
import { FirmDto } from '../../models/firm.model';

/**
 * "Audit strukturu": bir firmanın şöbələri, kateqoriyaları və mağazaları tablarda.
 * Seçilmiş firma (`firm`) və tab (`tab`) URL-dədir; hər tabın filtri öz açarı ilə (master-data-query.ts).
 */
@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    PageHeaderComponent,
    ListStateComponent,
    SectionsComponent,
    CategoriesComponent,
    LocationsComponent
  ],
  templateUrl: './master-data.component.html',
  styleUrl: './master-data.component.scss'
})
export class MasterDataComponent implements OnInit {
  private readonly firmService = inject(FirmService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  firms: FirmDto[] = [];
  selectedFirmId: number | null = queryNumber(this.query, 'firm');
  tabIndex = queryNumber(this.query, 'tab') ?? 0;
  isLoadingFirms = false;
  firmsError: string | null = null;

  ngOnInit(): void {
    this.loadFirms();
  }

  loadFirms(): void {
    this.isLoadingFirms = true;
    this.firmsError = null;
    this.firmService.getAllFirms().subscribe({
      next: response => {
        this.firms = Array.isArray(response?.data) ? response.data : [];
        this.isLoadingFirms = false;
        // URL-dəki firma yoxdursa (silinib, səhv link) birinci firma seçilir
        if (!this.firms.some(f => f.id === this.selectedFirmId)) {
          this.selectedFirmId = this.firms[0]?.id ?? null;
          writeQueryState(this.router, { firm: this.selectedFirmId });
        }
      },
      error: err => {
        this.isLoadingFirms = false;
        this.firmsError = apiErrorMessage(err, 'Firmalar yüklənmədi');
      }
    });
  }

  onFirmChange(firmId: number): void {
    this.selectedFirmId = firmId;
    writeQueryState(this.router, { firm: firmId, ...MASTER_DATA_TAB_RESET });
  }

  onTabChange(index: number): void {
    this.tabIndex = index;
    writeQueryState(this.router, { tab: index || null });
  }
}

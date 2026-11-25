import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../shared/utils/api-error';
import { DisruptionDto } from '../../disruptions/disruption.model';
import { Section } from '../../inspections/section.model';
import { AuditLoadingOverlayComponent } from '../audit-loading-overlay/audit-loading-overlay.component';
import { ComponentService } from '../component.service';
import { MediaType, Module } from '../media/media-type.enum';
import { MediaComponent } from '../media/media.component';

/** Yoxlama detalında planın uyğunsuzluqları: şöbə üzrə akkordeon, şöbə açılanda sətirlər yüklənir. */
@Component({
  selector: 'app-diruption-section',
  standalone: true,
  imports: [MatCardModule, MatExpansionModule, MatTableModule, MatTooltipModule,
    MediaComponent, AuditLoadingOverlayComponent, ListStateComponent, AppDatePipe],
  templateUrl: './diruption-section.component.html',
  styleUrl: './diruption-section.component.scss'
})
export class DiruptionSectionComponent implements OnChanges {
  @Input() data: any;

  readonly MediaType = MediaType;
  readonly Module = Module;
  readonly displayedColumns: string[] = ['position', 'disruptionCategoryName', 'reasonName', 'description', 'createdDate', 'media'];

  sections: Section[] = [];
  sectionsLoading = false;
  sectionsError: string | null = null;
  readonly disruptionsMap = new Map<number, DisruptionDto[]>();
  readonly loadingSectionIds = new Set<number>();
  readonly sectionErrors = new Map<number, string>();

  private planId: number | null = null;

  constructor(private componentService: ComponentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    const planId = changes['data']?.currentValue?.id;
    if (planId) {
      this.planId = planId;
      this.getSections();
    }
  }

  getSections(): void {
    if (!this.planId) return;
    this.sectionsLoading = true;
    this.sectionsError = null;
    this.disruptionsMap.clear();
    this.sectionErrors.clear();
    this.componentService.getDisruptionSectionByPlanId(this.planId).subscribe({
      next: response => {
        this.sections = response.success ? response.data : [];
        this.sectionsLoading = false;
      },
      error: error => {
        this.sectionsError = apiErrorMessage(error, 'Uyğunsuzluq şöbələri yüklənmədi');
        this.sectionsLoading = false;
      },
    });
  }

  onPanelOpened(section: Section): void {
    if (this.disruptionsMap.has(section.id) || this.loadingSectionIds.has(section.id)) {
      return;
    }
    this.loadingSectionIds.add(section.id);
    this.sectionErrors.delete(section.id);
    this.componentService.GetDisruptionsBySection(section.inspectionPlanId, section.id).subscribe({
      next: response => {
        if (response.success) {
          this.disruptionsMap.set(section.id, response.data);
        }
        this.loadingSectionIds.delete(section.id);
      },
      error: error => {
        this.sectionErrors.set(section.id, apiErrorMessage(error, 'Uyğunsuzluqlar yüklənmədi'));
        this.loadingSectionIds.delete(section.id);
      },
    });
  }

  hasMedia(element: DisruptionDto): boolean {
    return (element.image ?? 0) > 0 || (element.video ?? 0) > 0;
  }
}

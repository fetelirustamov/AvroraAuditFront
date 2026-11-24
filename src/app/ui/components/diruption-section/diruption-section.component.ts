import { Component, Input, SimpleChanges } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentService } from '../component.service';
import { Section } from '../../inspections/section.model';
import { DisruptionDto } from '../../disruptions/disruption.model';
import { MediaComponent } from '../media/media.component';
import { MediaType, Module } from '../media/media-type.enum';
import { AuditLoadingOverlayComponent } from '../audit-loading-overlay/audit-loading-overlay.component';

@Component({
  selector: 'app-diruption-section',
  imports: [MatCardModule, MatExpansionModule, CommonModule, MatTableModule, MatTooltipModule,
    MediaComponent, AuditLoadingOverlayComponent],
  templateUrl: './diruption-section.component.html',
  styleUrl: './diruption-section.component.scss'
})
export class DiruptionSectionComponent {
  @Input() data: any;

  MediaType = MediaType;
  Module = Module;
  displayedColumns: string[] = ['position', 'disruptionCategoryName', 'reasonName', 'description', 'createdDate', 'media'];
  public sections: Section[] = [];
  public sectionsLoading = false;
  public disruptionsMap = new Map<number, DisruptionDto[]>();
  public loadingSectionIds = new Set<number>();

  constructor(private _componentService: ComponentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    const planId = changes['data']?.currentValue?.id;
    if (planId) {
      this.getSections(planId);
    }
  }

  getSections(planId: number) {
    this.sectionsLoading = true;
    this.disruptionsMap.clear();
    this._componentService.getDisruptionSectionByPlanId(planId).subscribe({
      next: (response) => {
        this.sections = response.success ? response.data : [];
        this.sectionsLoading = false;
      },
      error: () => this.sectionsLoading = false,
    });
  }

  onPanelOpened(section: Section) {
    if (this.disruptionsMap.has(section.id) || this.loadingSectionIds.has(section.id)) {
      return;
    }
    this.loadingSectionIds.add(section.id);
    this._componentService.GetDisruptionsBySection(section.inspectionPlanId, section.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.disruptionsMap.set(section.id, response.data);
        }
        this.loadingSectionIds.delete(section.id);
      },
      error: () => this.loadingSectionIds.delete(section.id),
    });
  }

  hasMedia(element: DisruptionDto): boolean {
    return (element.image ?? 0) > 0 || (element.video ?? 0) > 0;
  }
}

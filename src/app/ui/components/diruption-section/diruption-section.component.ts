import { ChangeDetectorRef, Component, Input, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { ComponentService } from '../component.service';
import { Section } from '../../inspections/section.model';
import { DisruptionDto } from '../../disruptions/disruption.model';
import { MediaComponent } from '../media/media.component';
import { MediaType, Module } from '../media/media-type.enum';

@Component({
  selector: 'app-diruption-section',
  imports: [MatCardModule, MatButtonModule, MatExpansionModule, CommonModule, MatPaginatorModule,
    MatTableModule, MediaComponent],
  providers: [DatePipe],
  templateUrl: './diruption-section.component.html',
  styleUrl: './diruption-section.component.scss'
})
export class DiruptionSectionComponent {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Input() data: any; // Yeni 
  readonly panelOpenState = signal(false);
  MediaType = MediaType;
  Module = Module;
  displayedColumns: string[] = ['position', 'disruptionCategoryName', 'reasonName', 'description', 'createdDate', 'media'];
  public pageSizeOptions = [5, 10, 25, 100];
  public pageSize: number = 10;
  // public dataSource: InspectionPlan[] = [];
  public sections: Section[] = [];
  public disruptions: DisruptionDto[] = [];
  public allDataCount: number = 0;
  public disruptionsMap = new Map<number, DisruptionDto[]>();

  constructor(
    public themeService: CustomizerSettingsService,
    private _componentService: ComponentService,
    private router: Router,
    private cdr: ChangeDetectorRef,

    private location: Location,
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      // this.data = state["data"]; // row obyekti

      this.getSections(state['id']);

    } else {
      // this.location.back();
      return;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      if (changes['data'].currentValue) {

        this.getSections(changes['data'].currentValue.id);

      }
    }
  }


  getSections(id: number) {
    this._componentService.getDisruptionSectionByPlanId(id).subscribe((response) => {
      if (response.success) {
        this.sections = response.data;
        console.log('Sections:', this.sections);
      }
    });
  }

  getQuestionsAnswersByHeaderId(planId: number, sectionId: number) {
    this._componentService.GetDisruptionsBySection(planId, sectionId).subscribe((response) => {
      if (response.success) {
        const disruptions = response.data;
        this.disruptionsMap.set(sectionId, disruptions);
        this.cdr.detectChanges();
      }
    });
  }



  onPanelOpened(section: Section) {
    if (!this.disruptionsMap.has(section.id)) {
      this.getQuestionsAnswersByHeaderId(section.inspectionPlanId, section.id);
    }
  }

  getRowNumber(index: number): number {
    return this.paginator ? index + 1 + (this.paginator.pageIndex * this.paginator.pageSize) : index + 1;
  }

}
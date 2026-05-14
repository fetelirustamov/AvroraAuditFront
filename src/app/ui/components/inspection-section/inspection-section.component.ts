
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { Router, RouterLink } from '@angular/router';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { TableState } from '../../../models/table-state.model';
import { TableService } from '../../services/table.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { InspectionsService } from '../../inspections/inspections.service';
import { InspectionPlan } from '../../inspections/InpectionPlan.model';
import { ComponentService } from '../component.service';
import { Section } from '../../inspections/section.model';
import { QuestionWithDetails } from '../models/questionDto.model';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MediaComponent } from '../media/media.component';
import { MediaType, Module } from '../media/media-type.enum';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { ChangeDetectorRef, Component, Input, signal, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuditLoadingOverlayComponent } from '../audit-loading-overlay/audit-loading-overlay.component';

// Tree node interfaces

interface QuestionNode {
  name: string;
  comment?: string;
  media?: any;
  result?: any;
  maxScore?: number;
}

@Component({
  selector: 'app-inspection-section',
  imports: [MatCardModule, MatButtonModule, MatExpansionModule, CommonModule, MatPaginatorModule,
    MatTableModule, MatDialogModule, MediaComponent, MatTreeModule, CdkAccordionModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSlideToggleModule,
    AuditLoadingOverlayComponent
  ],
  providers: [DatePipe],
  viewProviders: [MatAccordion],
  templateUrl: './inspection-section.component.html',
  styleUrl: './inspection-section.component.scss'
})
export class InspectionSectionComponent {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('mediaModalTemplate') mediaModalTemplate!: TemplateRef<any>;

  // @ViewChild("sectionTable") table: DatatableComponent;
  @Input("section") data!: any; // Yeni 
  @Input("plan") plan!: any; // Yeni 

  readonly panelOpenState = signal(false);

  displayedColumns: string[] = ['position', 'questionText', 'comment', 'media', 'result'];
  public pageSizeOptions = [5, 10, 25, 100];
  public pageSize: number = 10;
  public sections: Section[] = [];
  public questions: QuestionWithDetails[] = [];
  public allDataCount: number = 0;
  MediaType = MediaType;
  Module = Module;
  expandedIndex = 0;
  public isLoading: boolean = false;
  public groupedQuestions: { categoryName: string, questions: QuestionWithDetails[] }[] = [];

  constructor(
    public themeService: CustomizerSettingsService,
    private _componentService: ComponentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {


  }


  getQuestionsAnswersByHeaderId(headerId: number) {
    this._componentService.getQuestionsAnswersByHeaderId(headerId).subscribe((response) => {
      if (response.success) {
        this.questions = response.data;
        this.groupQuestionsByCategory();
        console.log(this.questions)
      }
    });
  }

  private groupQuestionsByCategory() {
    const map = new Map<string, QuestionWithDetails[]>();
    for (const q of this.questions) {
      if (!map.has(q.categoryName)) {
        map.set(q.categoryName, []);
      }
      map.get(q.categoryName)!.push(q);
    }
    this.isLoading = false;
    this.groupedQuestions = Array.from(map.entries()).map(([categoryName, questions]) => ({ categoryName, questions }));
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  onPanelOpened() {
    this.isLoading = true;
    this.getQuestionsAnswersByHeaderId(this.data.headerId);

    // this.innerAccordion.closeAll();
  }


}
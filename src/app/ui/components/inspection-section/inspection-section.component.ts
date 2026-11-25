import { Component, Input, ViewChild, inject } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { CdkAccordion, CdkAccordionModule } from '@angular/cdk/accordion';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ComponentService } from '../component.service';
import { Section } from '../../inspections/section.model';
import { QuestionWithDetails } from '../models/questionDto.model';
import { MediaComponent } from '../media/media.component';
import { MediaType, Module } from '../media/media-type.enum';
import { AuditLoadingOverlayComponent } from '../audit-loading-overlay/audit-loading-overlay.component';
import { ListStateComponent } from '../../../shared/components/list-state/list-state.component';
import { complianceTone } from '../../../shared/utils/compliance';
import { apiErrorMessage } from '../../../shared/utils/api-error';

interface QuestionGroup {
  categoryName: string;
  questions: QuestionWithDetails[];
}

/** Yoxlama detalında bir şöbə: açılanda sualları kateqoriyalara bölünmüş akkordeonla göstərir. */
@Component({
  selector: 'app-inspection-section',
  standalone: true,
  imports: [
    NgClass, DecimalPipe, MatCardModule, MatExpansionModule, MatTableModule, MatTooltipModule, CdkAccordionModule,
    MediaComponent, AuditLoadingOverlayComponent, ListStateComponent,
  ],
  templateUrl: './inspection-section.component.html',
  styleUrl: './inspection-section.component.scss'
})
export class InspectionSectionComponent {
  private readonly componentService = inject(ComponentService);

  @Input('section') data: Section | null = null;
  @Input('plan') plan!: number | string | null;
  /** Şöbənin checklist faizi; hesablanmayıbsa undefined. */
  @Input() result?: number;

  readonly complianceTone = complianceTone;
  readonly displayedColumns = ['position', 'questionText', 'comment', 'media', 'result'];
  readonly MediaType = MediaType;
  readonly Module = Module;

  @ViewChild(CdkAccordion) private categoryAccordion?: CdkAccordion;

  groupedQuestions: QuestionGroup[] = [];
  /** Sualın kateqoriyadakı ilkin sıra nömrəsi: süzgəcdən sonra da eyni qalır */
  private readonly positions = new Map<QuestionWithDetails, number>();
  isLoading = false;
  loaded = false;
  loadError: string | null = null;

  /** Yalnız «Xeyr» cavablı Bəli/Xeyr sualları: bal itirən yeganə tanınan cavab budur */
  onlyNo = false;
  /** Göstərilən qruplar. Massiv yalnız data və ya süzgəc dəyişəndə yenilənir: cədvəl hər yoxlamada yenidən çəkilməsin */
  visibleGroups: QuestionGroup[] = [];
  noCount = 0;

  private applyFilter(): void {
    this.visibleGroups = this.onlyNo
      ? this.groupedQuestions
        .map(g => ({ categoryName: g.categoryName, questions: g.questions.filter(q => this.isNoAnswer(q)) }))
        .filter(g => g.questions.length > 0)
      : this.groupedQuestions;
  }

  toggleOnlyNo(): void {
    this.onlyNo = !this.onlyNo;
    this.applyFilter();
    // Süzülmüş siyahıda baxılacaq hər şey görünsün: kateqoriyalar açılır
    if (this.onlyNo) {
      setTimeout(() => this.categoryAccordion?.openAll());
    }
  }

  openAll(): void {
    this.categoryAccordion?.openAll();
  }

  closeAll(): void {
    this.categoryAccordion?.closeAll();
  }

  position(question: QuestionWithDetails): number {
    return this.positions.get(question) ?? 0;
  }

  noCountOf(group: QuestionGroup): number {
    return group.questions.filter(q => this.isNoAnswer(q)).length;
  }

  private isNoAnswer(question: QuestionWithDetails): boolean {
    return question.questionTypeID === 1 && this.yesNoAnswer(question) === 'no';
  }

  /** Suallar panel ilk dəfə açılanda yüklənir; xəta olubsa təkrar açanda yenidən cəhd edilir. */
  onPanelOpened(): void {
    if (!this.loaded && !this.isLoading) {
      this.loadQuestions();
    }
  }

  loadQuestions(): void {
    if (!this.data) return;
    this.isLoading = true;
    this.loadError = null;
    this.componentService.getQuestionsAnswersByHeaderId(this.data.headerId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.loadError = response.message || 'Suallar yüklənmədi';
            return;
          }
          this.groupedQuestions = this.groupByCategory(response.data ?? []);
          this.noCount = this.groupedQuestions.reduce((sum, g) => sum + this.noCountOf(g), 0);
          this.applyFilter();
          this.loaded = true;
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Suallar yüklənmədi')),
      });
  }

  /** Bəli/Xeyr tipli sualın cavabı; cavablandırılmayıbsa 'none' (Xeyr kimi göstərilməməlidir). */
  yesNoAnswer(element: QuestionWithDetails): 'yes' | 'no' | 'none' {
    const result = element.result as unknown;
    if (result === null || result === undefined || result === '') {
      return 'none';
    }
    const r = String(result);
    return r === 'true' || r === '1' || r === '1.00' ? 'yes' : 'no';
  }

  /** Radio/checkbox tipli sualda variantın seçilib-seçilmədiyini yoxlayır */
  isAnswerSelected(element: QuestionWithDetails, ansId: number): boolean {
    if (Array.isArray(element.result)) {
      return (element.result as unknown[]).map(String).includes(String(ansId));
    }
    return String(element.result) === String(ansId);
  }

  hasMedia(element: QuestionWithDetails): boolean {
    return (element.images ?? 0) > 0 || (element.videos ?? 0) > 0;
  }

  private groupByCategory(questions: QuestionWithDetails[]): QuestionGroup[] {
    const map = new Map<string, QuestionWithDetails[]>();
    for (const q of questions) {
      const bucket = map.get(q.categoryName);
      if (bucket) {
        bucket.push(q);
      } else {
        map.set(q.categoryName, [q]);
      }
    }
    this.positions.clear();
    map.forEach(items => items.forEach((q, i) => this.positions.set(q, i + 1)));
    return Array.from(map, ([categoryName, items]) => ({ categoryName, questions: items }));
  }
}

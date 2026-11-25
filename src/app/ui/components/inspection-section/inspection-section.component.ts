import { Component, Input, inject } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { CdkAccordionModule } from '@angular/cdk/accordion';
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

  groupedQuestions: QuestionGroup[] = [];
  isLoading = false;
  loaded = false;
  loadError: string | null = null;

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
    return Array.from(map, ([categoryName, items]) => ({ categoryName, questions: items }));
  }
}

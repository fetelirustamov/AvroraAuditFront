import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { DisruptionAnswerDTO } from '../../disruption-answer.model';
import { DisruptionAnswerService } from '../../disruption-answer.service';
import { MediaComponent } from '../../../components/media/media.component';
import { MediaType, Module } from '../../../components/media/media-type.enum';
import { ListStateComponent } from '../../../../shared/components/list-state/list-state.component';
import { StatusChipComponent } from '../../../../shared/status/status-chip.component';
import { StatusMeta } from '../../../../shared/status/status-meta';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';

/**
 * Mağaza cavabının statusu (`DisruptionAnswers.ApproveStatus`). status-meta.ts-də cavab statusu yoxdur:
 * ortaq lüğətə köçənə qədər etiket və ton burada qalır.
 */
const ANSWER_STATUS_META: Readonly<Record<number, StatusMeta>> = {
  1: { label: 'Həll edildi', tone: 'success' },
  2: { label: 'Gözləmədə', tone: 'warning' },
  3: { label: 'Razı deyiləm', tone: 'danger' },
};

/** Bir uyğunsuzluğa verilmiş bütün cavablar: kim yazıb, nə yazıb, faylları və statusu. */
@Component({
  selector: 'app-answer-history-dialog',
  standalone: true,
  imports: [MatDialogModule, MatTableModule, MatTooltipModule, MatProgressBarModule, MediaComponent, ListStateComponent, StatusChipComponent, AppDatePipe],
  templateUrl: './answer-history-dialog.component.html',
  styleUrl: './answer-history-dialog.component.scss',
})
export class AnswerHistoryDialogComponent implements OnInit {
  protected readonly row = inject<DisruptionAnswerDTO>(MAT_DIALOG_DATA);
  private readonly answerService = inject(DisruptionAnswerService);

  protected readonly displayedColumns = ['answeredUser', 'createdDate', 'note', 'media', 'status'];
  protected readonly MediaType = MediaType;
  protected readonly Module = Module;

  protected answers: DisruptionAnswerDTO[] = [];
  protected isLoading = false;
  protected loaded = false;
  protected loadError: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.isLoading = true;
    this.loadError = null;
    this.answerService.GetDisruptionAnswerByDisruptionId(String(this.row.disruptionId))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.answers = response.data ?? [];
          this.loaded = true;
        },
        error: (error) => (this.loadError = apiErrorMessage(error, 'Cavab tarixçəsi yüklənmədi')),
      });
  }

  protected statusMeta(status: number | undefined): StatusMeta {
    return (status != null && ANSWER_STATUS_META[status]) || { label: 'Naməlum', tone: 'neutral' };
  }
}

import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { finalize, forkJoin } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CategoryService } from '../../../services/category.service';
import { SectionService } from '../../../services/section.service';
import { FirmService } from '../../../services/firm.service';
import { QuestionService } from '../../../services/question.service';
import { FirmDto } from '../../../models/firm.model';
import { CategoryOption, categoryOptions } from '../../../shared/category-options';
import {
    ANSWER_QUESTION_TYPE_IDS,
    QUESTION_TYPES,
    QuestionAnswerInsertDto,
    QuestionInsertDto,
    QuestionTypeId,
    toQuestionTypeId
} from '../../../models/question.model';

const SCORE_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

type AnswerGroup = FormGroup<{
    id: FormControl<number | null>;
    text: FormControl<string>;
    score: FormControl<number | string>;
    status: FormControl<number>;
}>;

type QuestionFormValue = ReturnType<QuestionAddComponent['form']['getRawValue']>;

/**
 * Sual forması (səhifə): yeni sual, redaktə və baxış (`questions/view/:id`) rejimləri.
 * Firma sahəsi saxlanmır: yalnız kateqoriya seçimini süzür (kateqoriyanın firması şöbədən gəlir).
 */
@Component({
    selector: 'app-question-add',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatProgressBarModule,
        MatTooltipModule,
        TextFieldModule,
        PageHeaderComponent
    ],
    templateUrl: './question-add.component.html',
    styleUrl: './question-add.component.scss'
})
export class QuestionAddComponent implements OnInit {
    private readonly fb = inject(FormBuilder).nonNullable;
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly notify = inject(NotificationService);
    private readonly categoryService = inject(CategoryService);
    private readonly sectionService = inject(SectionService);
    private readonly firmService = inject(FirmService);
    private readonly questionService = inject(QuestionService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly destroyRef = inject(DestroyRef);

    @ViewChild(CdkTextareaAutosize) private textareaAutosize?: CdkTextareaAutosize;

    readonly questionTypes = QUESTION_TYPES;
    readonly id = this.route.snapshot.paramMap.get('id');
    readonly viewMode = (this.route.snapshot.routeConfig?.path ?? '').startsWith('questions/view');
    readonly editMode = !!this.id && !this.viewMode;

    firms: FirmDto[] = [];
    private allCategories: CategoryOption[] = [];
    isLoading = false;
    isSaving = false;
    /** Saxlama cəhdində cavab tələb edən tipdə cavab yox idi. */
    answersMissing = false;

    readonly form = this.fb.group({
        firmId: this.fb.control<number | null>(null, Validators.required),
        categoryId: this.fb.control<number | null>(null, Validators.required),
        type: this.fb.control<number | null>(null, Validators.required),
        order: this.fb.control<number | string | null>(null, Validators.pattern(/^[0-9]+$/)),
        valueNorm: this.fb.control<number | string | null>(null),
        question: ['', Validators.required],
        normative: [false],
        answers: this.fb.array<AnswerGroup>([])
    });

    get answers(): FormArray<AnswerGroup> {
        return this.form.controls.answers;
    }

    /** Kateqoriya seçimi seçilmiş firmanın şöbələri ilə məhdudlaşır. */
    get categoryOptions(): CategoryOption[] {
        const firmId = this.form.controls.firmId.value;
        return firmId == null ? [] : this.allCategories.filter(c => c.firmId === firmId);
    }

    ngOnInit(): void {
        const { firmId, categoryId, type } = this.form.controls;

        firmId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(id => {
            const selected = this.allCategories.find(c => c.id === categoryId.value);
            if (selected && selected.firmId !== id) categoryId.setValue(null);
        });

        type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (!this.isAnswerType()) {
                this.answers.clear();
            } else if (this.answers.length === 0 && !this.editMode && !this.viewMode) {
                this.addAnswer();
            }
        });

        this.loadData();
    }

    /** Firmalar, kateqoriya yolları və (redaktə/baxışda) sualın özü birlikdə yüklənir. */
    private loadData(): void {
        this.isLoading = true;
        forkJoin({
            firms: this.firmService.getAllFirms(),
            categories: this.categoryService.getAllCategories(),
            sections: this.sectionService.list()
        }).subscribe({
            next: ({ firms, categories, sections }) => {
                this.firms = Array.isArray(firms?.data) ? firms.data : [];
                this.allCategories = categoryOptions(
                    Array.isArray(categories?.data) ? categories.data : [],
                    Array.isArray(sections?.data) ? sections.data : []
                );
                if (this.id) {
                    this.loadQuestion(Number(this.id));
                } else {
                    this.isLoading = false;
                }
            },
            error: err => {
                this.isLoading = false;
                this.notify.error(apiErrorMessage(err, 'Firma və kateqoriyalar yüklənmədi'));
            }
        });
    }

    private loadQuestion(id: number): void {
        this.questionService.get(id)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: data => {
                    const q = this.unwrapQuestionPayload(data);

                    // Cavablar tipdən əvvəl doldurulur: tip dəyişəndə boş siyahıya avtomatik sətir əlavə olunmasın
                    this.answers.clear();
                    for (const a of this.answerRowsFromApi(q)) {
                        this.answers.push(this.answerGroup({
                            id: a.id ?? a.Id ?? null,
                            text: a.answer ?? a.text ?? a.Answer ?? a.Text ?? a.answerText ?? '',
                            score: a.score ?? a.Score ?? 0,
                            status: a.status ?? a.Status ?? 1
                        }));
                    }

                    const categoryId = q.categoryId ?? q.CategoryId ?? null;
                    this.form.patchValue({
                        firmId: this.allCategories.find(c => c.id === categoryId)?.firmId ?? null,
                        categoryId,
                        type: toQuestionTypeId(q.questionTypeID ?? q.QuestionTypeID ?? q.questionType ?? q.QuestionType),
                        order: q.questionLine ?? q.QuestionLine ?? q.order ?? q.Order ?? null,
                        valueNorm: q.normativeScore ?? q.NormativeScore ?? q.valueNorm ?? q.ValueNorm ?? null,
                        question: this.pickQuestionText(q),
                        normative: !!(q.isNormative ?? q.IsNormative ?? q.normative ?? q.Normative ?? false)
                    });
                    this.form.markAsPristine();
                    queueMicrotask(() => this.textareaAutosize?.resizeToFitContent(true));

                    if (this.viewMode) this.form.disable({ emitEvent: false });
                },
                error: err => this.notify.error(apiErrorMessage(err, 'Sual yüklənmədi'))
            });
    }

    /** API: { data } / { Data } / birbaşa obyekt; bəzi cavablarda bir səviyyə daha wrap ola bilər. */
    private unwrapQuestionPayload(raw: any): any {
        if (raw == null || typeof raw !== 'object') return raw;
        let cur: any = raw.data ?? raw.Data ?? raw;
        if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return cur;
        const textOn = (o: any) => o?.questionText ?? o?.QuestionText;
        if (!textOn(cur) && (cur.data != null || cur.Data != null)) {
            const inner = cur.data ?? cur.Data;
            if (inner && typeof inner === 'object' && !Array.isArray(inner) && textOn(inner)) cur = inner;
        }
        return cur;
    }

    private pickQuestionText(q: any): string {
        const v = q?.questionText ?? q?.QuestionText;
        return v != null ? String(v) : '';
    }

    private answerRowsFromApi(q: any): any[] {
        for (const list of [q?.answers, q?.questionAnswers, q?.QuestionAnswers, q?.Answers]) {
            if (Array.isArray(list) && list.length > 0) return list;
        }
        return [];
    }

    private answerGroup(value: { id: number | null; text: string; score: number | string; status: number }): AnswerGroup {
        return this.fb.group({
            id: this.fb.control<number | null>(value.id),
            text: this.fb.control(value.text, Validators.required),
            score: this.fb.control<number | string>(value.score, [Validators.required, Validators.pattern(SCORE_PATTERN)]),
            status: this.fb.control(value.status)
        });
    }

    isAnswerType(): boolean {
        const id = toQuestionTypeId(this.form.controls.type.value);
        return id !== null && ANSWER_QUESTION_TYPE_IDS.includes(id);
    }

    addAnswer(): void {
        if (!this.isAnswerType() || this.viewMode) return;
        this.answers.push(this.answerGroup({ id: null, text: '', score: 0, status: 1 }));
        this.answersMissing = false;
    }

    removeAnswer(index: number): void {
        const answer = this.answers.at(index);
        const text = answer.controls.text.value.trim();
        // Boş, yeni əlavə olunmuş sətir soruşulmadan silinir: itəcək məlumat yoxdur
        if (!text && answer.controls.id.value == null) {
            this.answers.removeAt(index);
            return;
        }
        this.confirmDialog.confirm({
            title: 'Cavab variantı silinsin?',
            message: '«Yadda saxla» basılandan sonra variant sualdan çıxacaq və mobil checklist-də görünməyəcək. '
                + 'Keçmiş yoxlama nəticələri dəyişmir. Saxlamadan əvvəl «Ləğv et» ilə geri qaytarmaq olar.',
            confirmText: 'Sil',
            tone: 'danger',
            items: [text || `Cavab ${index + 1}`]
        }).subscribe(result => {
            if (!result) return;
            this.answers.removeAt(index);
            this.answers.markAsDirty();
        });
    }

    submit(): void {
        if (this.viewMode || this.isSaving) return;
        this.answersMissing = this.isAnswerType() && this.answers.length === 0;
        if (this.form.invalid || this.answersMissing) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Qırmızı ilə işarələnmiş sahələri doldurun.' });
            return;
        }
        const raw = this.form.getRawValue();
        const questionTypeId = toQuestionTypeId(raw.type)!;
        const questionId = this.editMode ? Number(this.id) : undefined;
        const payload = this.buildApiPayload(raw, questionTypeId, questionId);
        const request = questionId != null
            ? this.questionService.update({ ...payload, id: questionId })
            : this.questionService.create(payload);

        this.isSaving = true;
        request.pipe(finalize(() => this.isSaving = false)).subscribe({
            next: () => {
                this.notify.success(this.editMode ? 'Sual yeniləndi' : 'Sual əlavə edildi');
                this.form.markAsPristine();
                this.router.navigate(['/admin/questions']);
            },
            error: err => this.notify.error(apiErrorMessage(err, this.editMode ? 'Sual yenilənmədi' : 'Sual əlavə edilmədi'))
        });
    }

    /** Form dəyərlərini backend QuestionInsertDto + QuestionAnswer modelinə çevirir. */
    private buildApiPayload(
        raw: QuestionFormValue,
        questionTypeId: QuestionTypeId,
        questionId?: number
    ): QuestionInsertDto {
        const payload: QuestionInsertDto = {
            status: 1,
            categoryId: raw.categoryId!,
            questionType: questionTypeId,
            questionLine: raw.order != null && raw.order !== '' ? Number(raw.order) : 0,
            normativeScore: raw.valueNorm != null && raw.valueNorm !== '' ? Number(raw.valueNorm) : 0,
            questionText: raw.question,
            isNormative: raw.normative ? 1 : 0
        };
        if (questionId != null) payload.id = questionId;

        if (ANSWER_QUESTION_TYPE_IDS.includes(questionTypeId)) {
            payload.questionAnswers = raw.answers.map((a, index) => {
                const answer: QuestionAnswerInsertDto = {
                    answer: a.text,
                    score: Number(a.score),
                    line: index + 1,
                    status: a.status ?? 1
                };
                if (a.id != null) answer.id = Number(a.id);
                if (questionId != null) answer.questionId = questionId;
                return answer;
            });
        }
        return payload;
    }

    cancel(): void {
        if (!this.form.dirty) {
            this.router.navigate(['/admin/questions']);
            return;
        }
        this.confirmDialog.confirm({
            title: 'Dəyişikliklər atılsın?',
            message: 'Saxlanmamış dəyişikliklər itəcək və geri qaytarılmayacaq. Sual əvvəlki kimi qalır.',
            confirmText: 'Dəyişiklikləri at',
            cancelText: 'Redaktəyə qayıt',
            tone: 'danger'
        }).subscribe(result => {
            if (result) this.router.navigate(['/admin/questions']);
        });
    }
}

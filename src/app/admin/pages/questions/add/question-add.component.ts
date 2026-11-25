import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { ConfirmDialogService } from '../../../../shared/components/confirm-dialog/confirm-dialog.service';
import { CategoryService } from '../../../services/category.service';
import { QuestionService } from '../../../services/question.service';
import { CategoryDto } from '../../../models/category.model';
import {
    ANSWER_QUESTION_TYPE_IDS,
    QUESTION_TYPES,
    QuestionAnswerInsertDto,
    QuestionInsertDto,
    QuestionTypeId,
    toQuestionTypeId
} from '../../../models/question.model';

@Component({
    selector: 'app-question-add',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatIconModule,
        MatDialogModule,
        MatTooltipModule,
        TextFieldModule
    ],
    templateUrl: './question-add.component.html',
    styleUrl: './question-add.component.scss'
})
export class QuestionAddComponent implements OnInit {
    form!: FormGroup;

    @ViewChild(CdkTextareaAutosize) private questionTextareaAutosize?: CdkTextareaAutosize;

    categories: CategoryDto[] = [];
    /** `type` form control-u birbaşa backend QuestionTypeID saxlayır (1..5) */
    questionTypes = QUESTION_TYPES;

    /** API: { data } / { Data } / birbaşa obyekt; bəzi cavablarda bir səviyyə daha wrap ola bilər */
    private unwrapQuestionPayload(raw: any): any {
        if (raw == null || typeof raw !== 'object') return raw;
        let cur: any = raw.data ?? raw.Data ?? raw;
        if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return cur;

        const textOn = (o: any) =>
            o?.questionText ?? o?.QuestionText ?? o?.question_text ?? o?.Question_Text;
        if ((textOn(cur) == null || textOn(cur) === '') && (cur.data != null || cur.Data != null)) {
            const inner = cur.data ?? cur.Data;
            if (inner && typeof inner === 'object' && !Array.isArray(inner) && textOn(inner)) {
                cur = inner;
            }
        }
        return cur;
    }

    private pickQuestionText(q: any): string {
        if (!q || typeof q !== 'object') return '';
        const v =
            q.questionText ??
            q.QuestionText ??
            q.question_text ??
            q.Question_Text;
        return v != null && v !== '' ? String(v) : '';
    }

    private answerRowsFromApi(q: any): any[] {
        if (!q || typeof q !== 'object') return [];
        const lists = [q.answers, q.questionAnswers, q.QuestionAnswers, q.Answers];
        for (const list of lists) {
            if (Array.isArray(list) && list.length > 0) return list;
        }
        return [];
    }

    /** API-dən gələn tipi 1..5 id-yə normalize edir; 0 / NULL / kənar dəyər üçün null */
    private resolveQuestionType(q: any): QuestionTypeId | null {
        return toQuestionTypeId(
            q.questionTypeID ?? q.QuestionTypeID ?? q.questionType ?? q.QuestionType
        );
    }

    /** Form dəyərlərini backend QuestionInsertDto + QuestionAnswer modelinə map edir */
    private buildApiPayload(raw: any, questionTypeId: QuestionTypeId, questionId?: number): QuestionInsertDto {
        const payload: QuestionInsertDto = {
            status: 1,
            categoryId: raw.categoryId,
            questionType: questionTypeId,
            questionLine: raw.order != null && raw.order !== '' ? Number(raw.order) : 0,
            normativeScore: raw.valueNorm != null && raw.valueNorm !== '' ? Number(raw.valueNorm) : 0,
            questionText: raw.question,
            isNormative: raw.normative ? 1 : 0
        };

        if (questionId != null) {
            payload.id = questionId;
        }

        if (ANSWER_QUESTION_TYPE_IDS.includes(questionTypeId) && Array.isArray(raw.answers)) {
            payload.questionAnswers = raw.answers.map(
                (a: { id?: number | null; text: string; score: number | string; status?: number }, index: number) => {
                    const answer: QuestionAnswerInsertDto = {
                        answer: a.text,
                        score: Number(a.score),
                        line: index + 1,
                        status: a.status ?? 1
                    };
                    if (a.id != null) {
                        answer.id = Number(a.id);
                    }
                    if (questionId != null) {
                        answer.questionId = questionId;
                    }
                    return answer;
                }
            );
        }

        return payload;
    }

    pageTitle = 'Yeni sual';
    editMode = false;
    viewMode = false;
    isSaving = false;
    id?: string | null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private notify: NotificationService,
        private route: ActivatedRoute,
        private categoryService: CategoryService,
        private questionService: QuestionService,
        private confirmDialog: ConfirmDialogService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.form = this.fb.group({
            categoryId: [null, Validators.required],
            type: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
            order: [null, [Validators.pattern(/^[0-9]+$/)]],
            valueNorm: [''],
            question: ['', Validators.required],
            normative: [false],
            answers: this.fb.array([])
        });

        this.form.get('type')?.valueChanges.subscribe(() => {
            if (!this.isAnswerType()) {
                this.answers.clear();
            } else if (this.answers.length === 0 && !this.editMode && !this.viewMode) {
                this.addAnswer();
            }
        });

        this.id = this.route.snapshot.paramMap.get('id');
        const routePath = this.route.snapshot.routeConfig?.path ?? '';
        this.viewMode = routePath.includes('view');
        this.editMode = !!this.id && !this.viewMode;

        if (this.viewMode) {
            this.pageTitle = 'Sual detalları';
        } else if (this.editMode) {
            this.pageTitle = 'Sual redaktəsi';
        }

        this.categoryService.getAllCategories().subscribe({
            next: list => this.categories = list.data,
            error: e => this.notify.error(apiErrorMessage(e, 'Kateqoriyalar yüklənmədi'))
        });

        if ((this.editMode || this.viewMode) && this.id) {
            this.questionService.get(+this.id).subscribe({
                next: (data: any) => {
                    const q = this.unwrapQuestionPayload(data);

                    // Əvvəlcə cavabları yüklə (type valueChanges-dən əvvəl)
                    this.answers.clear();
                    const answerRows = this.answerRowsFromApi(q);
                    if (answerRows.length > 0) {
                        answerRows.forEach((a: any) => {
                            const text =
                                a.answer ??
                                a.text ??
                                a.Answer ??
                                a.Text ??
                                a.answerText ??
                                '';
                            const score = a.score ?? a.Score ?? 0;
                            const answerId = a.id ?? a.Id ?? null;
                            const status = a.status ?? a.Status ?? 1;
                            this.answers.push(
                                this.fb.group({
                                    id: [answerId],
                                    text: [text, Validators.required],
                                    score: [score, [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
                                    status: [status]
                                })
                            );
                        });
                    }

                    // Formu doldur — emitEvent:true olsun ki type seçili görünsün
                    this.form.patchValue({
                        categoryId: q.categoryId ?? q.CategoryId ?? null,
                        type: this.resolveQuestionType(q),
                        order: q.questionLine ?? q.QuestionLine ?? q.order ?? q.Order ?? null,
                        valueNorm:
                            q.normativeScore ??
                            q.NormativeScore ??
                            q.valueNorm ??
                            q.ValueNorm ??
                            '',
                        question: this.pickQuestionText(q),
                        normative: !!(q.isNormative ?? q.IsNormative ?? q.normative ?? q.Normative ?? false)
                    });

                    this.cdr.detectChanges();
                    queueMicrotask(() => this.questionTextareaAutosize?.resizeToFitContent(true));

                    if (this.viewMode) {
                        this.form.disable({ emitEvent: false });
                    }
                },
                error: (e) => {
                    this.notify.error(apiErrorMessage(e, 'Sual yüklənmədi'));
                    if (this.viewMode) {
                        this.form.disable({ emitEvent: false });
                    }
                }
            });
        } else {
            if (this.viewMode) {
                this.form.disable({ emitEvent: false });
            }
        }
    }

    get answers(): FormArray {
        return this.form.get('answers') as FormArray;
    }

    isAnswerType(): boolean {
        const id = toQuestionTypeId(this.form.get('type')?.value);
        return id !== null && ANSWER_QUESTION_TYPE_IDS.includes(id);
    }

    canShowAddAnswer(): boolean {
        return this.isAnswerType() && !this.viewMode;
    }

    addAnswer(): void {
        if (!this.isAnswerType() || this.viewMode) return;
        this.answers.push(
            this.fb.group({
                id: [null],
                text: ['', Validators.required],
                score: [0, [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]],
                status: [1]
            })
        );
    }

    removeAnswer(index: number): void {
        if (this.viewMode) return;
        this.confirmDialog.confirm({
            title: 'Cavab silinsin?',
            message: 'Bu cavabı silmək istədiyinizə əminsiniz?',
            confirmText: 'Sil',
            tone: 'danger'
        }).subscribe(confirmed => {
            if (!confirmed) return;
            this.answers.removeAt(index);
        });
    }

    private validateAnswersForType(): boolean {
        if (!this.isAnswerType()) return true;
        if (this.answers.length === 0) return false;
        return this.answers.controls.every(ctrl => ctrl.valid);
    }

    submit(): void {
        if (this.viewMode) { this.router.navigate(['/admin/questions']); return; }
        if (this.isSaving) return;
        const answersOk = this.validateAnswersForType();
        if (this.form.invalid || !answersOk) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
            return;
        }
        const raw = this.form.getRawValue();
        const questionTypeId = toQuestionTypeId(raw.type);
        if (questionTypeId === null) {
            this.notify.warning('Sual tipi düzgün deyil', { message: 'Sual tipi 1..5 aralığından seçilməlidir.' });
            return;
        }

        this.isSaving = true;
        if (this.editMode && this.id) {
            const questionId = +this.id;
            const payload = this.buildApiPayload(raw, questionTypeId, questionId);
            this.questionService.update({ ...payload, id: questionId })
                .pipe(finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this.notify.success('Sual uğurla redaktə edildi');
                        this.router.navigate(['/admin/questions']);
                    },
                    error: e => this.notify.error(apiErrorMessage(e, 'Sual redaktə edilmədi'))
                });
        } else {
            const payload = this.buildApiPayload(raw, questionTypeId);
            this.questionService.create(payload)
                .pipe(finalize(() => this.isSaving = false))
                .subscribe({
                    next: () => {
                        this.notify.success('Sual uğurla əlavə edildi');
                        this.router.navigate(['/admin/questions']);
                    },
                    error: e => this.notify.error(apiErrorMessage(e, 'Sual əlavə edilmədi'))
                });
        }
    }

    cancel(): void {
        this.router.navigate(['/admin/questions']);
    }
} 
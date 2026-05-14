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
import { NotificationService } from '../../../../shared/services/notification.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';
import { CategoryService } from '../../../services/category.service';
import { QuestionService } from '../../../services/question.service';
import { CategoryDto } from '../../../models/category.model';

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
    types: string[] = ['Bəli/Xeyr', 'RadioButton', 'FreeText', 'ComboBox', 'CheckBox'];

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

    private resolveQuestionType(q: any): string | null {
        const strType = q.questionType ?? q.QuestionType;
        if (typeof strType === 'string' && this.types.includes(strType)) {
            return strType;
        }
        if (typeof strType === 'string' && /^\d+$/.test(strType.trim())) {
            const idx = +strType - 1;
            if (idx >= 0 && idx < this.types.length) return this.types[idx];
        }
        const numId =
            q.questionTypeID ??
            q.QuestionTypeID ??
            (typeof strType === 'number' ? strType : null);
        if (numId != null && numId !== '') {
            const n = Number(numId);
            if (!Number.isNaN(n)) return this.types[n - 1] ?? null;
        }
        return null;
    }
    typesWithAnswers = new Set(['RadioButton', 'ComboBox', 'CheckBox']);

    pageTitle = 'Yeni Sual Yaradın';
    editMode = false;
    viewMode = false;
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
            type: [null, Validators.required],
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
            this.pageTitle = 'Suala baxış';
        } else if (this.editMode) {
            this.pageTitle = 'Sualı redaktə edin';
        }

        this.categoryService.getAllCategories().subscribe(list => this.categories = list.data);

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
                            this.answers.push(
                                this.fb.group({
                                    text: [text, Validators.required],
                                    score: [score, [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]]
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
                error: () => {
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
        return this.typesWithAnswers.has(this.form.get('type')?.value);
    }

    canShowAddAnswer(): boolean {
        return this.isAnswerType() && !this.viewMode;
    }

    addAnswer(): void {
        if (!this.isAnswerType() || this.viewMode) return;
        this.answers.push(
            this.fb.group({
                text: ['', Validators.required],
                score: [0, [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]+)?$/)]]
            })
        );
    }

    removeAnswer(index: number): void {
        if (this.viewMode) return;
        this.confirmDialog.confirm({
            title: 'Cavab silinsin?',
            message: 'Bu cavabı silmək istədiyinizə əminsiniz?',
            confirmText: 'Bəli, sil',
            cancelText: 'Ləğv et'
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
        const answersOk = this.validateAnswersForType();
        if (this.form.invalid || !answersOk) {
            this.form.markAllAsTouched();
            this.notify.warning('Forma tamamlanmayıb', { message: 'Zəhmət olmasa tələb olunan sahələri doldurun.' });
            return;
        }
        const raw = this.form.getRawValue();

        // Backend modelində property adı QuestionText-dir, formda isə question istifadə edirik
        const payload: any = {
            categoryId: raw.categoryId,
            questionType: raw.type,
            order: raw.order,
            valueNorm: raw.valueNorm,
            questionText: raw.question,
            normative: raw.normative
        };

        // Cavab tipli suallar üçün cavabları backend-in gözlədiyi formata salaq (əgər lazımdırsa)
        if (this.isAnswerType() && Array.isArray(raw.answers)) {
            payload.answers = raw.answers.map((a: any) => ({
                answer: a.text,
                score: a.score
            }));
        }

        if (this.editMode && this.id) {
            this.questionService.update({ ...payload, id: +this.id }).subscribe(() => {
                this.notify.success('Sual uğurla redaktə edildi');
                this.router.navigate(['/admin/questions']);
            });
        } else {
            this.questionService.create(payload).subscribe(() => {
                this.notify.success('Sual uğurla əlavə edildi');
                this.router.navigate(['/admin/questions']);
            });
        }
    }

    cancel(): void {
        this.router.navigate(['/admin/questions']);
    }
} 
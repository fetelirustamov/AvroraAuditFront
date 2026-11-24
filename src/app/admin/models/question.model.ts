
/** Backend QuestionTypeID — baza və API yalnız 1..5 qəbul edir */
export const QUESTION_TYPES = [
    { id: 1, label: 'Bəli/Xeyr' },
    { id: 2, label: 'RadioButton' },
    { id: 3, label: 'CheckBox' },
    { id: 4, label: 'FreeText' },
    { id: 5, label: 'ComboBox' }
] as const;

export type QuestionTypeId = typeof QUESTION_TYPES[number]['id'];

/** Cavab variantı tələb edən tiplər: RadioButton, CheckBox, ComboBox */
export const ANSWER_QUESTION_TYPE_IDS: readonly QuestionTypeId[] = [2, 3, 5];

/** İstənilən dəyəri 1..5 id-yə normalize edir; kənar dəyər (0, NULL, kənar rəqəm) üçün null */
export function toQuestionTypeId(value: unknown): QuestionTypeId | null {
    const id = Number(value);
    return QUESTION_TYPES.some(t => t.id === id) ? (id as QuestionTypeId) : null;
}

export function questionTypeLabel(value: unknown): string {
    const id = toQuestionTypeId(value);
    return id === null ? '—' : QUESTION_TYPES.find(t => t.id === id)!.label;
}

export interface QuestionAnswerDto {
    id: number;
    questionId: number;
    answer: string;
    status: number;
    score: number;
}

export interface QuestionAnswerInsertDto {
    id?: number;
    questionId?: number;
    answer: string;
    score: number;
    line?: number;
    status?: number;
}

/** POST/PUT /api/Questions gövdəsi (Swagger: QuestionInsertDto) */
export interface QuestionInsertDto {
    id?: number;
    status?: number;
    categoryId: number;
    questionText: string;
    questionType: number;
    questionLine: number;
    isNormative: number;
    normativeScore: number;
    questionAnswers?: QuestionAnswerInsertDto[];
}

export interface QuestionDto {
    id: number;
    categoryId: number;
    categoryName?: string;

    // Backend-dən gələn sahələr
    questionTypeID?: number;
    questionLine?: number | null;
    isNormative?: number | boolean;
    normativeScore?: number | null;
    status?: number;

    // Admin UI-də istifadə etdiyimiz sahələr
    questionType?: string | number;
    order?: number | null;
    valueNorm?: number | null;
    questionText: string;
    normative: boolean;
    answers?: QuestionAnswerDto[];
    questionAnswers?: QuestionAnswerDto[] | QuestionAnswerInsertDto[];
}

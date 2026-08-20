
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

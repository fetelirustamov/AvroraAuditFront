
export interface QuestionAnswerDto {
    id: number;
    questionId: number;
    answer: string;
    status: number;
    score: number;
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
    questionType?: string;
    order?: number | null;
    valueNorm?: number | null;
    questionText: string;
    normative: boolean;
    answers?: QuestionAnswerDto[];
}

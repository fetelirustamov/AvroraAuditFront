export interface Question {
    id: number;
    status: number;

    categoryId: number;
    questionText: string;
    questionType: number;
    questionLine: number;
    isNormative: number;
    normativeScore: number;
}

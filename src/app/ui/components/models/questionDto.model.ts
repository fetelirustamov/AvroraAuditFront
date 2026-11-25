import { Question } from "./question.model";


export interface QuestionWithDetails extends Question {
    /** Sual tipi: 1 Bəli/Xeyr, 2 tək seçim, 3 çox seçim, 4 mətn, 5 rəqəm (API `QuestionTypeID` göndərir) */
    questionTypeID: number;
    categoryName: string;
    questionId: number;
    result: number;
    maxScore: number;
    comment: string;
    score: number;
    headerId: number;
    images: number;
    videos: number;
    document: number;
    questionAnswers: QuestionAnswers[];
}


export interface QuestionAnswers {
    questionId: number;
    answer: string;
    id: number;
    status: number;
    score: number;
    line: number;

}

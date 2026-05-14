import { Question } from "./question.model";


export interface QuestionWithDetails extends Question {
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

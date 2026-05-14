import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse, RequestResponse, RequestResponseOne } from '../../models/table-state.model';
import { Section } from '../inspections/section.model';
import { QuestionWithDetails } from './models/questionDto.model';
import { Disruption, DisruptionDto } from '../disruptions/disruption.model';
import { PlanInfo } from './models/plan-info.model';

@Injectable({
    providedIn: 'root'
})
export class ComponentService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }


    getQuestionSectionByPlanId(firmId: number): Observable<RequestResponse<Section>> {
        return this.http.get<RequestResponse<Section>>(`${this.baseUrl}/questionResults/sections/${firmId}`);
    }

    getQuestionsAnswersByHeaderId(headerId: number): Observable<RequestResponse<QuestionWithDetails>> {
        return this.http.get<RequestResponse<QuestionWithDetails>>(`${this.baseUrl}/questionResults/header/${headerId}`);
    }

    getDisruptionSectionByPlanId(firmId: number): Observable<RequestResponse<Section>> {
        return this.http.get<RequestResponse<Section>>(`${this.baseUrl}/disruptions/sections/${firmId}`);
    }

    GetDisruptionsBySection(planId: number, sectionId: number): Observable<RequestResponse<DisruptionDto>> {
        return this.http.get<RequestResponse<DisruptionDto>>(`${this.baseUrl}/disruptions/${planId}/${sectionId}`);
    }

    GetMedia(refId: number, type: number): Observable<string[]> {
        const url = `${this.baseUrl}/attachments/media/${refId}/${type}`;
        return this.http.get<string[]>(url);
    }

    GetDocuments(refId: number, module: number): Observable<string[]> {
        const url = `${this.baseUrl}/attachments/documents/${refId}/${module}`;
        return this.http.get<string[]>(url);
    }

    GetPlanInfoByPlanId(planId: number): Observable<RequestResponseOne<PlanInfo>> {
        return this.http.get<RequestResponseOne<PlanInfo>>(`${this.baseUrl}/inspectionPlans/info/${planId}`);
    }

    GetChecklistByPlanId(planId: number): Observable<RequestResponseOne<string>> {
        return this.http.get<RequestResponseOne<string>>(`${this.baseUrl}/inspectionPlans/checklist/${planId}`);

    }

} 
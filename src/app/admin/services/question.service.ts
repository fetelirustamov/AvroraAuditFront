import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QuestionDto } from '../models/question.model';
import { RequestResponse } from '../../models/table-state.model';


@Injectable({ providedIn: 'root' })
export class QuestionService {
    private readonly baseUrl = `${environment.apiUrl}/questions`;

    constructor(private http: HttpClient) { }

    list(): Observable<RequestResponse<QuestionDto>> {
        return this.http.get<RequestResponse<QuestionDto>>(this.baseUrl);
    }

    get(id: number): Observable<QuestionDto> {
        return this.http.get<QuestionDto>(`${this.baseUrl}/${id}`);
    }

    create(payload: Partial<QuestionDto>): Observable<QuestionDto> {
        return this.http.post<QuestionDto>(this.baseUrl, payload);
    }

    /** PUT baza URL-ə gedir; sualın təkili gövdədə `id` sahəsi ilə göndərilir */
    update(payload: Partial<QuestionDto> & { id: number }): Observable<QuestionDto> {
        return this.http.put<QuestionDto>(this.baseUrl, payload);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }
}



import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RequestResponse } from '../../models/table-state.model';
import { SectionDto } from '../models/section.model';



@Injectable({ providedIn: 'root' })
export class SectionService {
    private readonly baseUrl = `${environment.apiUrl}/sections`;

    constructor(private http: HttpClient) { }

    list(): Observable<RequestResponse<SectionDto>> {
        return this.http.get<RequestResponse<SectionDto>>(this.baseUrl);
    }

    get(id: number): Observable<RequestResponse<SectionDto>> {
        return this.http.get<RequestResponse<SectionDto>>(`${this.baseUrl}/${id}`);
    }

    create(payload: Partial<SectionDto>): Observable<RequestResponse<SectionDto>> {
        return this.http.post<RequestResponse<SectionDto>>(this.baseUrl, payload);
    }

    /** PUT baza URL-ə gedir; şöbənin id-si gövdədə göndərilir */
    update(payload: Partial<SectionDto> & { id: number }): Observable<RequestResponse<SectionDto>> {
        return this.http.put<RequestResponse<SectionDto>>(this.baseUrl, payload);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    getByFirmId(firmId: number): Observable<RequestResponse<SectionDto>> {
        return this.http.get<RequestResponse<SectionDto>>(`${this.baseUrl}/firm/${firmId}`);
    }
}



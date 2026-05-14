import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirmDto } from '../models/firm.model';
import { RequestResponse } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class FirmService {
    private readonly baseUrl = `${environment.apiUrl}/firms`;

    constructor(private http: HttpClient) { }

    // Get all firms (for dropdowns, etc.)
    getAllFirms(): Observable<RequestResponse<FirmDto>> {
        return this.http.get<RequestResponse<FirmDto>>(`${this.baseUrl}/allFirms`);
    }

    // Get firm by ID
    getFirm(id: number): Observable<RequestResponse<FirmDto>> {
        return this.http.get<RequestResponse<FirmDto>>(`${this.baseUrl}/${id}`);
    }

    // Create new firm
    createFirm(payload: Partial<FirmDto>): Observable<RequestResponse<FirmDto>> {
        return this.http.post<RequestResponse<FirmDto>>(this.baseUrl, payload);
    }

    // Update existing firm
    updateFirm(id: number, payload: Partial<FirmDto>): Observable<RequestResponse<FirmDto>> {
        return this.http.put<RequestResponse<FirmDto>>(`${this.baseUrl}/${id}`, payload);
    }

    // Delete firm
    deleteFirm(id: number): Observable<RequestResponse<FirmDto>> {
        return this.http.delete<RequestResponse<FirmDto>>(`${this.baseUrl}/${id}`);
    }
}


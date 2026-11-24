import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RequestResponse, RequestResponseOne, TableState } from '../../../models/table-state.model';
import { DisruptionTrackingData, DisruptionTrackingDetail } from './disruption-tracking.model';

export interface DisruptionCategoryOption {
    id: number;
    categoryName: string;
}

@Injectable({ providedIn: 'root' })
export class DisruptionTrackingService {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    list(state: TableState): Observable<RequestResponseOne<DisruptionTrackingData>> {
        return this.http.post<RequestResponseOne<DisruptionTrackingData>>(`${this.apiUrl}/disruptions/tracking`, state);
    }

    detail(id: number): Observable<RequestResponseOne<DisruptionTrackingDetail>> {
        return this.http.get<RequestResponseOne<DisruptionTrackingDetail>>(`${this.apiUrl}/disruptions/tracking/${id}`);
    }

    categoriesByFirm(firmId: number): Observable<RequestResponse<DisruptionCategoryOption>> {
        return this.http.get<RequestResponse<DisruptionCategoryOption>>(`${this.apiUrl}/disruptionCategories/firm/${firmId}`);
    }
}

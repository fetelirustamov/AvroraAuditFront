import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TableResponse, TableState } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
    private readonly baseUrl = `${environment.apiUrl}/Reports`;

    constructor(private http: HttpClient) { }

    /** Planlı / plansız yoxlamalar — mağaza və bölgə üzrə */
    getInspectionDetailsByStoreRegion(state: TableState): Observable<TableResponse<unknown>> {
        return this.http.post<TableResponse<unknown>>(`${this.baseUrl}/getDetails`, state, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        });
    }

    /** Planlı / plansız yoxlamalar — auditor üzrə */
    getInspectionDetailsByInspector(state: TableState): Observable<TableResponse<unknown>> {
        return this.http.post<TableResponse<unknown>>(`${this.baseUrl}/getInspectorDetails`, state, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        });
    }

    /** Kateqoriya üzrə normativ və faktiki bal (mövqe, region, filial) */
    getCategoryScoreDetails(state: TableState): Observable<TableResponse<unknown>> {
        return this.http.post<TableResponse<unknown>>(`${this.baseUrl}/getCategoryScoreDetails`, state, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        });
    }

    /** Kateqoriya balı bölmə (section) ilə — Sections join */
    getCategoryScoreDetailsBySection(state: TableState): Observable<TableResponse<unknown>> {
        return this.http.post<TableResponse<unknown>>(`${this.baseUrl}/getCategoryScoreDetailsBySection`, state, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        });
    }
}

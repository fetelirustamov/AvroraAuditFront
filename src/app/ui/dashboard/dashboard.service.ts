import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RequestResponseOne } from '../../models/table-state.model';
import { DashboardFilter, DashboardOverview } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly baseUrl = `${environment.apiUrl}/Dashboard`;

    constructor(private readonly http: HttpClient) { }

    /** Səhifənin bütün blokları bir sorğuda gəlir */
    getOverview(filter: DashboardFilter): Observable<RequestResponseOne<DashboardOverview>> {
        return this.http.post<RequestResponseOne<DashboardOverview>>(`${this.baseUrl}/overview`, filter);
    }
}

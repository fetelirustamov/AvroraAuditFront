import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { RequestResponseOne, TableResponse, TableState } from '../../../models/table-state.model';
import { DisruptionTrackingData } from '../../disruptions/disruption-tracking/disruption-tracking.model';

/**
 * İş növbəsinin sayları mövcud siyahı endpoint-lərindən gəlir: 1 sətirlik səhifə istənir və `total` oxunur.
 * Server hər sorğunu istifadəçinin öz əhatəsinə salır (firma və ya "öz datası"), Admin hamısını görür.
 */
@Injectable({ providedIn: 'root' })
export class AttentionService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    /** `TableResponse` qaytaran siyahının ümumi sətir sayı */
    count(endpoint: string, filter: Record<string, string>): Observable<number> {
        return this.http.post<TableResponse<unknown>>(`${this.apiUrl}/${endpoint}`, this.state(filter))
            .pipe(map(res => res?.data?.total ?? 0));
    }

    /** Uyğunsuzluq izləməsinin mərhələ sayları (ümumi və gecikən) */
    disruptionStages(): Observable<DisruptionTrackingData['stages']> {
        return this.http.post<RequestResponseOne<DisruptionTrackingData>>(`${this.apiUrl}/disruptions/tracking`, this.state({}))
            .pipe(map(res => res?.data?.stages ?? []));
    }

    private state(filter: Record<string, string>): TableState {
        const state = new TableState();
        state.filter = filter;
        state.paginator.page = 0;
        state.paginator.size = 1;
        return state;
    }
}

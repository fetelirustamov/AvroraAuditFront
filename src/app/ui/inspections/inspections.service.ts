import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Firm } from './firm.model';
import { Location } from './location.model';
import { RequestResponse } from '../../models/table-state.model';
import { Section } from './section.model';

@Injectable({
    providedIn: 'root'
})
export class InspectionsService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getFirms() {
        return this.http.get<RequestResponse<Firm>>(`${this.baseUrl}/firms`);

    }

    getLocationByFirmId(firmId: number): Observable<RequestResponse<Location>> {
        return this.http.get<RequestResponse<Location>>(`${this.baseUrl}/firms/${firmId}/locations`);
    }

    getSections(planId: number) {
        return this.http.get<RequestResponse<Section>>(`${this.baseUrl}/inspections/sections/${planId}`);
    }

}
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { RequestResponse } from '../../../models/table-state.model';
import { LocationInspectionPlanSummary } from './location-inspection-summary.model';

@Injectable({ providedIn: 'root' })
export class LocationProfileService {
  constructor(private http: HttpClient) {}

  getInspectionSummaries(locationCode: number) {
    return this.http.get<RequestResponse<LocationInspectionPlanSummary>>(
      `${environment.apiUrl}/LocationProfile/inspection-summaries/${locationCode}`
    );
  }
}

import { Injectable } from '@angular/core';
import { Disruption, DisruptionApproveDto, DisruptionDto } from './disruption.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';

@Injectable({
  providedIn: 'root'
})
export class DisruptionService {

  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }


  aprovePlan(planApproveList: DisruptionApproveDto[]): Observable<any> {
    const url = `${this.API_URL}/disruptions/setStatus`;

    const config = {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    };

    return this.http.post<any>(url, planApproveList, config);

  }

  updateDisruption(disruption: Disruption): Observable<any> {
    const url = `${this.API_URL}/disruptions`;
    const config = {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    };

    return this.http.put<any>(url, disruption, config);
  }

  getById(id: number): Observable<RequestResponseOne<Disruption>> {
    const url = `${this.API_URL}/disruptions/${id}`;
    return this.http.get<RequestResponseOne<Disruption>>(url);
  }

  getReasonsByCategory(categoryId: number): Observable<RequestResponse<any>> {
    const url = `${this.API_URL}/disruptionReasons/category/${categoryId}`;
    return this.http.get<RequestResponse<any>>(url);
  }


}
import { Injectable } from '@angular/core';
import { Disruption, DisruptionApproveDto, DisruptionDto } from './disruption.model';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';
import { StatusChange } from '../../shared/status/status-reason.component';

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

  /** Hər uyğunsuzluğun səbəbi yazılmış son status dəyişikliyi (rədd, müfəttişə qaytarma). Səbəbsizlər cavabda yoxdur. */
  getStatusReasons(ids: readonly number[]): Observable<RequestResponseOne<StatusChange[]>> {
    const params = new HttpParams({ fromObject: { ids: ids.map(String) } });
    return this.http.get<RequestResponseOne<StatusChange[]>>(`${this.API_URL}/disruptions/statusReasons`, { params });
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
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './user.model';
import { InspectionPlan } from '../inspections/InpectionPlan.model';
import { RequestResponse } from '../../models/table-state.model';
import { PlanApprove } from './plan.model';

@Injectable({
  providedIn: 'root'
})
export class PlanService {

  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getInspectors(firmId: number, roleId?: number): Observable<RequestResponse<User>> {
    let params = new HttpParams();

    if (roleId !== undefined && roleId !== null) {
      params = params.set('roleId', roleId.toString());
    }
    return this.http.get<RequestResponse<User>>(`${this.API_URL}/firms/${firmId}/users`, { params });
  }

  addPlan(plan: InspectionPlan): Observable<any> {
    const url = `${this.API_URL}/inspectionPlans`;

    const config = {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    };

    //return this.http.get<any>(url);
    return this.http.post<any>(url, plan, config);

  }

  aprovePlan(planApproveList: PlanApprove[]): Observable<any> {
    const url = `${this.API_URL}/inspectionPlans/setStatus`;

    const config = {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    };

    return this.http.post<any>(url, planApproveList, config);

  }




}

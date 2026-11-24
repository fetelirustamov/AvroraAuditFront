import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './user.model';
import { InspectionPlan } from '../inspections/InpectionPlan.model';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';
import { PlanApprove } from './plan.model';
import { DailyDistanceReportRow, RoutePlanDto } from './route-plan.model';

@Injectable({
  providedIn: 'root'
})
export class PlanService {

  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /** Plana təyin edilə bilən istifadəçilər — rol süzgəci backend-dədir (Inspector, HeadInspector). */
  getInspectors(firmId: number): Observable<RequestResponse<User>> {
    return this.http.get<RequestResponse<User>>(`${this.API_URL}/firms/${firmId}/inspectors`);
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

  getRoute(inspectorId: number, date: string): Observable<RequestResponseOne<RoutePlanDto>> {
    const params = new HttpParams()
      .set('date', date)
      .set('inspectorId', inspectorId.toString());

    return this.http.get<RequestResponseOne<RoutePlanDto>>(`${this.API_URL}/inspectionPlans/route`, { params });
  }

  getDailyDistanceReport(firmId: number, startDate: string, endDate: string): Observable<RequestResponseOne<DailyDistanceReportRow[]>> {
    const params = new HttpParams()
      .set('firmId', firmId.toString())
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<RequestResponseOne<DailyDistanceReportRow[]>>(`${this.API_URL}/inspectionPlans/dailyDistanceReport`, { params });
  }

}

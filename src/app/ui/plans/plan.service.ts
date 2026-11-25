import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './user.model';
import { InspectionPlan } from '../inspections/InpectionPlan.model';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';
import { StatusChange } from '../../shared/status/status-reason.component';
import { PlanApprove, PlanChecklistSummary } from './plan.model';

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

  /** Onay siyahısının sətirləri üçün checklist faizi və uyğunsuzluq sayı (bir sorğuda, ən çox 200 plan). */
  getChecklistSummaries(planIds: readonly number[]): Observable<RequestResponse<PlanChecklistSummary>> {
    const params = new HttpParams({ fromObject: { ids: planIds.map(String) } });
    return this.http.get<RequestResponse<PlanChecklistSummary>>(`${this.API_URL}/inspectionPlans/checklist/summaries`, { params });
  }

  /** Planın səbəbi yazılmış son status dəyişikliyi (rədd, mobilə qaytarma, yenidən açma); yoxdursa `data: null`. */
  getStatusReason(planId: number): Observable<RequestResponseOne<StatusChange | null>> {
    return this.http.get<RequestResponseOne<StatusChange | null>>(`${this.API_URL}/inspectionPlans/statusReason/${planId}`);
  }

}

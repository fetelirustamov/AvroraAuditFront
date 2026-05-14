import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RequestResponse } from '../../models/table-state.model';
import { DisruptionAnswerApproveDto, DisruptionAnswerDTO } from './disruption-answer.model';

@Injectable({
  providedIn: 'root'
})
export class DisruptionAnswerService {

  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) { }


  // AproveDisruptionAnswer(disruptionAnswerApproveList: DisruptionAnswerApproveDto): Observable<any> {
  //   const url = `${this.API_URL}/disruptionAnswers/approveDisruptionAnswer`;

  //   const config = {
  //     headers: new HttpHeaders().set("Content-Type", "application/json"),
  //   };

  //   return this.http.post<any>(url, disruptionAnswerApproveList, config);

  // }

  AddDisruptionAnswer(disruptionAnswer: any): Observable<any> {
    const url = `${this.API_URL}/disruptionAnswers`;

    const config = {
      headers: new HttpHeaders().set("Content-Type", "application/json"),
    };

    return this.http.post<any>(url, disruptionAnswer, config);
  }


  GetDisruptionAnswerByDisruptionId(disruptionId: string): Observable<RequestResponse<DisruptionAnswerDTO>> {
    const url = `${this.API_URL}/disruptionAnswers/disruption/${disruptionId}`;
    return this.http.get<RequestResponse<DisruptionAnswerDTO>>(url);
  }








}
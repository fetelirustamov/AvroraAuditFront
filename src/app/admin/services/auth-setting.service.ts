import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSettingDto } from '../models/auth-setting.model';
import { RequestResponse } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class AuthSettingService {
    private readonly baseUrl = `${environment.apiUrl}/authsettings`;

    constructor(private http: HttpClient) { }

    // Autentifikasiya növləri (yeni istifadəçi formasındaki seçim üçün)
    getAllAuthSettings(): Observable<RequestResponse<AuthSettingDto>> {
        return this.http.get<RequestResponse<AuthSettingDto>>(this.baseUrl);
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RoleDto, RoleDetailDto, RoleCreateDto, RoleUpdateDto } from '../models/role.model';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
    private readonly baseUrl = `${environment.apiUrl}/Roles`;

    constructor(private http: HttpClient) { }

    // Bütün rolları əldə et (API array və ya wrapped response qaytara bilər)
    getAllRoles(): Observable<RequestResponse<RoleDto>> {
        return this.http.get<RequestResponse<RoleDto>>(this.baseUrl);
    }

    // ID-yə görə rol ətraflı məlumatı — /api/Roles/{roleId}/details
    getRoleById(id: number): Observable<RoleDetailDto> {
        return this.http.get<any>(`${this.baseUrl}/${id}/details`).pipe(
            map(res => (res?.data !== undefined ? res.data : res) as RoleDetailDto)
        );
    }

    // Yeni rol yarat
    createRole(payload: RoleCreateDto): Observable<RequestResponseOne<RoleDto>> {
        return this.http.post<RequestResponseOne<RoleDto>>(this.baseUrl, payload);
    }

    // Rolu yenilə
    updateRole(id: number, payload: RoleUpdateDto): Observable<RequestResponseOne<RoleDto>> {
        return this.http.put<RequestResponseOne<RoleDto>>(`${this.baseUrl}/${id}`, payload);
    }

    // Rolu sil
    deleteRole(id: number): Observable<RequestResponseOne<null>> {
        return this.http.delete<RequestResponseOne<null>>(`${this.baseUrl}/${id}`);
    }
}

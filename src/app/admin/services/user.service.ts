import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserDto, UserCreateDto, UserDetail, UserAssignmentsPutDto, UserProfilePutDto, UserPasswordPutDto } from '../models/user.model';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly baseUrl = `${environment.apiUrl}/users`;

    constructor(private http: HttpClient) { }

    // Bütün istifadəçiləri əldə et
    getAllUsers(): Observable<RequestResponse<UserDto>> {
        return this.http.get<RequestResponse<UserDto>>(this.baseUrl);
    }

    // İstifadəçi detallarını əldə et (userId göndərilməsə hamısı gəlir)
    getUserDetails(userId?: number): Observable<RequestResponseOne<UserDetail[]>> {
        let params = new HttpParams();
        if (userId !== undefined && userId !== null) {
            params = params.set('userId', userId.toString());
        }
        return this.http.get<RequestResponseOne<UserDetail[]>>(
            `${this.baseUrl}/userdetails`,
            { params }
        );
    }

    // ID-yə görə istifadəçi əldə et
    getUserById(id: number): Observable<RequestResponseOne<UserDto>> {
        return this.http.get<RequestResponseOne<UserDto>>(`${this.baseUrl}/${id}`);
    }

    // Rola görə istifadəçiləri əldə et
    getUsersByRole(roleId: number): Observable<RequestResponse<UserDto>> {
        return this.http.get<RequestResponse<UserDto>>(`${this.baseUrl}/role/${roleId}`);
    }

    // Firmaya görə istifadəçiləri əldə et
    getUsersByFirm(firmId: number): Observable<RequestResponse<UserDto>> {
        return this.http.get<RequestResponse<UserDto>>(`${this.baseUrl}/firm/${firmId}`);
    }

    // Yeni istifadəçi yarat
    createUser(payload: UserCreateDto): Observable<RequestResponseOne<number>> {
        return this.http.post<RequestResponseOne<number>>(this.baseUrl, payload);
    }

    // İstifadəçini sil
    deleteUser(id: number): Observable<RequestResponseOne<null>> {
        return this.http.delete<RequestResponseOne<null>>(`${this.baseUrl}/${id}`);
    }

    /** İstifadəçinin statusunu, müəssisələrini və rolunu yenilə */
    updateUserAssignments(userCode: number, payload: UserAssignmentsPutDto): Observable<RequestResponseOne<unknown>> {
        const url = `${environment.apiUrl}/Users/user-code/${userCode}/assignments`;
        return this.http.put<RequestResponseOne<unknown>>(url, payload);
    }

    /** İstifadəçinin kimlik məlumatlarını (ad, soyad, ata adı, vəzifə, e-poçt) yenilə */
    updateUserProfile(userCode: number, payload: UserProfilePutDto): Observable<RequestResponseOne<unknown>> {
        const url = `${environment.apiUrl}/Users/user-code/${userCode}/profile`;
        return this.http.put<RequestResponseOne<unknown>>(url, payload);
    }

    /** Admin tərəfindən parol sıfırlama — köhnə parol tələb olunmur */
    updateUserPassword(userCode: number, payload: UserPasswordPutDto): Observable<RequestResponseOne<unknown>> {
        const url = `${environment.apiUrl}/Users/user-code/${userCode}/password`;
        return this.http.put<RequestResponseOne<unknown>>(url, payload);
    }
}

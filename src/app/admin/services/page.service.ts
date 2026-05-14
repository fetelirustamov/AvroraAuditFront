import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PageDto, PageCreateDto, PageUpdateDto } from '../models/page.model';
import { RequestResponse, RequestResponseOne } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class PageService {
    private readonly baseUrl = `${environment.apiUrl}/Pages`;

    constructor(private http: HttpClient) { }

    // Bütün səhifələri əldə et (API array və ya wrapped response qaytara bilər)
    list(): Observable<PageDto[]> {
        return this.http.get<any>(this.baseUrl).pipe(
            map(res => Array.isArray(res) ? res : (res?.data ?? []))
        );
    }

    // ID-yə görə səhifə əldə et
    getById(id: number): Observable<RequestResponseOne<PageDto>> {
        return this.http.get<RequestResponseOne<PageDto>>(`${this.baseUrl}/${id}`);
    }

    // Yeni səhifə yarat
    create(payload: PageCreateDto): Observable<RequestResponseOne<PageDto>> {
        return this.http.post<RequestResponseOne<PageDto>>(this.baseUrl, payload);
    }

    // Səhifəni yenilə
    update(id: number, payload: PageUpdateDto): Observable<RequestResponseOne<PageDto>> {
        return this.http.put<RequestResponseOne<PageDto>>(`${this.baseUrl}/${id}`, payload);
    }

    // Səhifəni sil
    delete(id: number): Observable<RequestResponseOne<null>> {
        return this.http.delete<RequestResponseOne<null>>(`${this.baseUrl}/${id}`);
    }
}

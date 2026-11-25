import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import {
    ReplaceStructureChainsDto,
    ReplaceStructureChainsResultDto,
    StructureDto
} from "../models/structure.model";
import { RequestResponse, RequestResponseOne } from "../../models/table-state.model";

@Injectable({ providedIn: 'root' })
export class StructureService {
    private readonly baseUrl = `${environment.apiUrl}/Structures`;

    constructor(private http: HttpClient) { }

    // [GET] /api/Structures - bütün strukturlar
    list(): Observable<RequestResponse<StructureDto>> {
        return this.http.get<RequestResponse<StructureDto>>(this.baseUrl);
    }

    // [GET] /api/Structures/location/{locationCode} - locationCode-a görə strukturlar
    getByLocationCode(locationCode: number): Observable<RequestResponse<StructureDto>> {
        return this.http.get<RequestResponse<StructureDto>>(`${this.baseUrl}/location/${locationCode}`);
    }

    // [POST] /api/Structures - yeni struktur yaratmaq
    create(payload: Partial<StructureDto>): Observable<RequestResponse<StructureDto>> {
        return this.http.post<RequestResponse<StructureDto>>(this.baseUrl, payload);
    }

    // [POST] /api/Structures/chains - toplu idxal: mağazaların onay zəncirini tam əvəz edir
    replaceChains(payload: ReplaceStructureChainsDto): Observable<RequestResponseOne<ReplaceStructureChainsResultDto>> {
        return this.http.post<RequestResponseOne<ReplaceStructureChainsResultDto>>(`${this.baseUrl}/chains`, payload);
    }

    // [PUT] /api/Structures/{id} - mövcud strukturu yeniləmək
    update(id: number, payload: Partial<StructureDto>): Observable<RequestResponse<StructureDto>> {
        return this.http.put<RequestResponse<StructureDto>>(`${this.baseUrl}/${id}`, payload);
    }

    // [DELETE] /api/Structures/{id} - strukturu silmək
    delete(id: number): Observable<RequestResponse<StructureDto>> {
        return this.http.delete<RequestResponse<StructureDto>>(`${this.baseUrl}/${id}`);
    }
}

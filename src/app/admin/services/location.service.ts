import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { LocationDto } from "../models/location.model";
import { RequestResponse } from "../../models/table-state.model";

@Injectable({ providedIn: 'root' })
export class LocationService {
    private readonly baseUrl = `${environment.apiUrl}/locations`;

    constructor(private http: HttpClient) { }

    // [GET] /api/locations  - bütün location-lar
    list(): Observable<RequestResponse<LocationDto>> {
        return this.http.get<RequestResponse<LocationDto>>(this.baseUrl);
    }

    // [GET] /api/locations/{id} - id-yə görə tək location
    get(id: number): Observable<RequestResponse<LocationDto>> {
        return this.http.get<RequestResponse<LocationDto>>(`${this.baseUrl}/${id}`);
    }

    // [POST] /api/locations  - yeni location yaratmaq
    create(payload: Partial<LocationDto>): Observable<RequestResponse<LocationDto>> {
        return this.http.post<RequestResponse<LocationDto>>(this.baseUrl, payload);
    }

    // [PUT] /api/locations  - mövcud location-u yeniləmək
    // Controller-də [HttpPut] Update([FromBody] Location location) olduğu üçün id route-da deyil, body-dədir
    update(payload: LocationDto): Observable<RequestResponse<LocationDto>> {
        return this.http.put<RequestResponse<LocationDto>>(this.baseUrl, payload);
    }

    // [DELETE] /api/locations/{id} - location silmək
    delete(id: number): Observable<RequestResponse<LocationDto>> {
        return this.http.delete<RequestResponse<LocationDto>>(`${this.baseUrl}/${id}`);
    }

    // [GET] /api/locations/sections/{locationCode}/{firmId} - controller-dəki xüsusi endpoint
    getSectionsByLocationCode(locationCode: number, firmId: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/sections/${locationCode}/${firmId}`);
    }

    // [GET] /api/locations/regions/{firmId} - firmaya görə regionları gətirir
    getRegionsByFirmId(firmId: number): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/regions/${firmId}`);
    }

    // [POST] /api/locations/sections/assign - location-a section-lar assign et
    assignSections(payload: { locationCode: number; sectionIds: number[] }): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/sections/assign`, payload);
    }
}
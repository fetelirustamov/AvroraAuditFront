import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryDto, CategoryCreateDto, CategoryUpdateDto } from '../models/category.model';
import { FirmDto } from '../models/firm.model';
import { RequestResponse } from '../../models/table-state.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private readonly baseUrl = `${environment.apiUrl}/categories`;

    constructor(private http: HttpClient) { }

    // Get all categories (for dropdowns, etc.)
    getAllCategories(): Observable<RequestResponse<CategoryDto>> {
        return this.http.get<RequestResponse<CategoryDto>>(`${this.baseUrl}`);
    }

    // Get categories with pagination, filtering, and sorting
    getCategories(): Observable<RequestResponse<CategoryDto>> {
        return this.http.get<RequestResponse<CategoryDto>>(this.baseUrl);
    }

    // Get category by ID
    getCategory(id: number): Observable<RequestResponse<CategoryDto>> {
        return this.http.get<RequestResponse<CategoryDto>>(`${this.baseUrl}/${id}`);
    }

    // Create new category
    createCategory(payload: CategoryCreateDto): Observable<RequestResponse<CategoryDto>> {
        return this.http.post<RequestResponse<CategoryDto>>(this.baseUrl, payload);
    }

    // Update existing category — PUT baza URL; id gövdədə
    updateCategory(payload: CategoryUpdateDto & { id: number }): Observable<RequestResponse<CategoryDto>> {
        return this.http.put<RequestResponse<CategoryDto>>(this.baseUrl, payload);
    }

    // Delete category
    deleteCategory(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    // // Legacy methods for backward compatibility
    // list(): Observable<CategoryDto[]> {
    //     return this.http.get<CategoryDto[]>(this.baseUrl);
    // }

    // get(id: number): Observable<CategoryDto> {
    //     return this.http.get<CategoryDto>(`${this.baseUrl}/${id}`);
    // }

    // create(payload: Partial<CategoryDto>): Observable<CategoryDto> {
    //     return this.http.post<CategoryDto>(this.baseUrl, payload);
    // }

    // update(id: number, payload: Partial<CategoryDto>): Observable<CategoryDto> {
    //     return this.http.put<CategoryDto>(`${this.baseUrl}/${id}`, payload);
    // }

    // delete(id: number): Observable<void> {
    //     return this.http.delete<void>(`${this.baseUrl}/${id}`);
    // }
}



import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";

import { BehaviorSubject, Observable, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { TableResponse, TableState } from "../../models/table-state.model";

@Injectable({
	providedIn: "any",
})
export class TableService<T = any> {
	public api_url: string = "";
	private _items$ = new BehaviorSubject<T[]>([]);
	constructor(private _httpClient: HttpClient) { }

	get items$() {
		return this._items$.asObservable();
	}

	fill(tableState: TableState): Observable<TableResponse<T>> {
		const url = `${environment.apiUrl}/${this.api_url}`;
		const config = {
			headers: new HttpHeaders().set("Content-Type", "application/json"),
		};
		var request = this._httpClient.post<any>(url, tableState, config).pipe(
			tap((result: TableResponse<T>) => {
				if (result != null && result.data.items != null) {
					this._items$.next(result.data.items);
				} else {
					this._items$.next([]);
				}
			}),
			// Sorğu düşəndə cədvəl köhnə məlumatla qalmasın. Xətanı çağıran ekran göstərir
			// (`success: false` + `message`, adətən <app-list-state state="error">), toast burada verilmir:
			// əks halda istifadəçi eyni xətanı iki dəfə görür.
			catchError((error: HttpErrorResponse) => {
				this._items$.next([]);
				return of(this.emptyResponse(error));
			})
		);
		return request;
	}

	private errorMessage(error: HttpErrorResponse): string {
		if (error.status === 0) {
			return "Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın.";
		}
		if (error.status === 403) {
			return "Bu məlumatlara baxmaq üçün icazəniz yoxdur.";
		}
		return "Məlumatları yükləmək mümkün olmadı. Yenidən cəhd edin.";
	}

	private emptyResponse(error: HttpErrorResponse): TableResponse<T> {
		return {
			success: false,
			message: this.errorMessage(error),
			data: { items: [], total: 0 },
		};
	}
}

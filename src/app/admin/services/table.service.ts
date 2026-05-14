import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { BehaviorSubject, Observable } from "rxjs";
import { tap } from "rxjs/operators";
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
		// console.log(tableState)
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
			})
		);
		return request;
	}
}


import internal from "assert";
import { Observable } from "rxjs";

export const PageSizes = [3, 5, 10, 15, 50, 100];
export type SortDirection = "asc" | "desc" | "";

export class TableState {
	filter: Record<string, string>;
	paginator: Page;
	sorting: Sort;
	searchTerm: string;
	disruptionStatus?: number;
	constructor() {
		this.paginator = new Page();
		this.filter = {};
		this.sorting = new Sort();
		this.searchTerm = "";
	}
}

export class Page {
	size: number;
	page: number;
	total: number;
	pages: number;

	constructor() {
		this.size = PageSizes[2];
		this.page = 0;
		this.total = 0;
		this.pages = 0;
	}
}

export class Sort {
	column: string;
	direction: SortDirection;

	constructor() {
		this.column = "id";
		this.direction = "asc";
	}
}

export interface TableResponse<T> {
	success: boolean;
	message: string;
	data: TableResponseData<T>;

}

// export interface TablesResponse<T> {
// 	ll: T[];
// 	paginator: Page;
// }

export interface TableResponseData<T> {
	items: T[];
	total: number;
}

export class RequestResponse<T> {
	success!: boolean;
	message!: string;
	data!: T[];
}


export interface PagedResponse<T> {
	items: T[];
	columns: any[];
	footer: any[];
	total: number;
}

export interface RequestResponseOne<T> {
	success: boolean;
	message: string;
	data: T;
}


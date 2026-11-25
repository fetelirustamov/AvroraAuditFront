import { ActivatedRoute, Router } from '@angular/router';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { QueryValue, queryNumber, writeQueryState } from '../../shared/utils/query-state';

/**
 * Brauzerdə süzülən (`MatTableDataSource`) admin siyahısının səhifə nömrəsini URL-də saxlayır.
 * Filtr dəyərlərini komponent özü `query-state.ts` ilə oxuyur; bu sinif yalnız səhifəni bərpa edir
 * və filtr dəyişəndə səhifəni sıfırlayır.
 *
 * Səhifə data gələndən sonra bərpa olunur: `MatTableDataSource` boş data ilə paginator-u 0-a çəkir.
 *
 * @example
 * readonly urlState = new TableUrlState(this.router, this.route);
 * // data gələndə:
 * this.dataSource.data = rows;
 * this.urlState.restorePage(this.paginator, this.dataSource.filteredData.length);
 * // şablonda: <mat-paginator (page)="urlState.writePage($event)">
 */
export class TableUrlState {
    private pendingPage: number | null;

    /**
     * @param pageKey Səhifə nömrəsinin açarı. Bir URL-də bir neçə siyahı olanda (tablar) hər birinin öz açarı olur.
     */
    constructor(private readonly router: Router, route: ActivatedRoute, private readonly pageKey = 'page') {
        this.pendingPage = queryNumber(route.snapshot.queryParamMap, pageKey);
    }

    /** Filtri URL-ə yazır, səhifə nömrəsini silir (yeni axtarış birinci səhifədən başlayır). */
    writeFilters(values: Record<string, QueryValue>): void {
        writeQueryState(this.router, { ...values, [this.pageKey]: null });
    }

    writePage(event: PageEvent): void {
        writeQueryState(this.router, { [this.pageKey]: event.pageIndex || null });
    }

    /** URL-dəki səhifəni bir dəfə, ilk data gələndə tətbiq edir. Səhifə yoxdursa sonuncuya çəkilir. */
    restorePage(paginator: MatPaginator | undefined, length: number): void {
        const page = this.pendingPage;
        this.pendingPage = null;
        if (!paginator || !page || page < 1) return;

        const lastPage = Math.max(0, Math.ceil(length / paginator.pageSize) - 1);
        const pageIndex = Math.min(page, lastPage);
        if (pageIndex === paginator.pageIndex) return;

        const previousPageIndex = paginator.pageIndex;
        paginator.pageIndex = pageIndex;
        paginator.page.emit({ pageIndex, previousPageIndex, pageSize: paginator.pageSize, length });
    }
}

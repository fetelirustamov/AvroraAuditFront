import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subject } from 'rxjs';

@Injectable()
export class AzPaginatorIntl implements MatPaginatorIntl {
    changes = new Subject<void>();

    firstPageLabel  = 'İlk səhifə';
    lastPageLabel   = 'Son səhifə';
    nextPageLabel   = 'Növbəti səhifə';
    previousPageLabel = 'Əvvəlki səhifə';
    itemsPerPageLabel = 'Səhifədə:';

    getRangeLabel(page: number, pageSize: number, length: number): string {
        if (length === 0) {
            return 'Məlumat yoxdur';
        }
        const start = page * pageSize + 1;
        const end   = Math.min((page + 1) * pageSize, length);
        return `${start} – ${end} / ${length}`;
    }
}

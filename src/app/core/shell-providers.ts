import { Provider } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { AzPaginatorIntl } from './az-paginator-intl.service';
import { DATE_ADAPTER_PROVIDERS } from './az-date-adapter';

/**
 * Tətbiq çərçivələrinin (UI və admin) ortaq provider-ləri.
 *
 * Kökdə (app.config.ts) deyil, lazy route-larda verilir: MatPaginatorIntl-i
 * kökdə qeydə almaq bütün paginator modulunu (form-field, select, overlay)
 * başlanğıc bundle-a çəkir və giriş səhifəsini ağırlaşdırır.
 */
export const SHELL_PROVIDERS: Provider[] = [
    { provide: MatPaginatorIntl, useClass: AzPaginatorIntl },
    ...DATE_ADAPTER_PROVIDERS
];

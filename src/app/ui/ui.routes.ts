import { Route, Routes } from '@angular/router';
import { UiComponent } from './ui.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { permissionGuard } from '../auth/guards/permission.guard';
import { uiPageRoutes } from './ui-pages.routes';
import { SHELL_PROVIDERS } from '../core/shell-providers';

/**
 * Menyuda pageKey-i olan hər səhifə icazə ilə qorunur: menyudan gizlənən səhifə URL ilə də açılmasın.
 * Əsas Səhifə istisnadır - girişdən sonra hamı ora yönləndirilir (datası serverdə firma ilə süzülür).
 */
const LANDING_PAGE_KEY = 'dashboard';

function withPermission(route: Route): Route {
    const pageKey: string | undefined = route.data?.['menu']?.pageKey ?? route.data?.['pageKey'];
    if (!pageKey || pageKey === LANDING_PAGE_KEY) return route;
    return { ...route, canMatch: [...(route.canMatch ?? []), permissionGuard] };
}

export const uiRoutes: Routes = [
    {
        path: '',
        component: UiComponent,
        canActivate: [AuthGuard],
        providers: SHELL_PROVIDERS,
        children: uiPageRoutes.map(withPermission),
    },
];

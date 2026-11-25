import { Route, Routes } from '@angular/router';
import { ShellComponent } from '../common/shell/shell.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { permissionGuard, routePageKeys } from '../auth/guards/permission.guard';
import { uiPageRoutes } from './ui-pages.routes';
import { SHELL_PROVIDERS } from '../core/shell-providers';

/**
 * İcazə açarı olan hər səhifə, uşaq route-lar da daxil, öz açarı ilə qorunur: menyudan
 * gizlənən səhifə URL ilə də açılmasın. Açarı valideyndə yox, səhifənin öz route-unda
 * yaz — yoxsa alt səhifə bölmənin siyahı icazəsini tələb edər.
 * Əsas Səhifə istisnadır - girişdən sonra hamı ora yönləndirilir (datası serverdə firma ilə süzülür).
 */
const LANDING_PAGE_KEY = 'dashboard';

function withPermission(route: Route): Route {
    const children = route.children?.map(withPermission);
    const keys = routePageKeys(route);
    const guarded = keys.length > 0 && !keys.includes(LANDING_PAGE_KEY);
    return {
        ...route,
        ...(children ? { children } : {}),
        ...(guarded ? { canMatch: [...(route.canMatch ?? []), permissionGuard] } : {}),
    };
}

export const uiRoutes: Routes = [
    {
        path: '',
        component: ShellComponent,
        canActivate: [AuthGuard],
        providers: SHELL_PROVIDERS,
        data: { area: 'ui' },
        children: uiPageRoutes.map(withPermission),
    },
];

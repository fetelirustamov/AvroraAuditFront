import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Route, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../auth.service';
import { PermissionService } from '../permission.service';

/**
 * Route-u `data.menu.pageKey` (və ya `data.pageKey`) üzrə icazəyə görə qoruyur.
 * Açar yoxdursa qorunma tələb olunmur; Admin (super-rol) bypass edir.
 *
 * `canMatch` seçilib ki, icazə olmayan route heç uyğunlaşmasın (lazy chunk da
 * yüklənmir). İcazələr hələ yüklənməyibsə gözlənilir — səhifə yenilənəndə vacibdir.
 */
export const permissionGuard: CanMatchFn = (route: Route) => {
    const permissions = inject(PermissionService);
    const auth = inject(AuthService);
    const router = inject(Router);

    const pageKey: string | undefined =
        route.data?.['menu']?.pageKey ?? route.data?.['pageKey'];

    if (!pageKey) return true;
    if (auth.hasRole('Admin')) return true;

    return toObservable(permissions.loaded).pipe(
        filter(loaded => loaded),
        take(1),
        map(() => (permissions.canShow(pageKey) ? true : router.parseUrl('/unauthorized')))
    );
};

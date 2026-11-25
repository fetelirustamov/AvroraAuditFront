import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanMatchFn, Route, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../auth.service';
import { PermissionService } from '../permission.service';

/**
 * Route-un icazə açarları: menyu bəndinin `data.menu.pageKey`-i, menyusuz səhifədə
 * (detal, forma) `data.pageKey` — bir açar və ya bir neçəsi. Bir neçə açardan biri
 * kifayətdir: məsələn, yoxlamanın detalı həm Yoxlamalar, həm Təsdiq siyahısından açılır.
 */
export function routePageKeys(route: Route): string[] {
    const key: string | string[] | undefined = route.data?.['menu']?.pageKey ?? route.data?.['pageKey'];
    if (!key) return [];
    return Array.isArray(key) ? key : [key];
}

/**
 * Route-u öz icazə açarı(lar)ı üzrə qoruyur (`routePageKeys`). Açar yoxdursa qorunma
 * tələb olunmur; Admin (super-rol) bypass edir. Hər səhifə, uşaq route da daxil,
 * yalnız öz açarına baxır (`ui.routes.ts` guard-ı bütün ağaca qoşur).
 *
 * `canMatch` seçilib ki, icazə olmayan route heç uyğunlaşmasın (lazy chunk da
 * yüklənmir). İcazələr hələ yüklənməyibsə gözlənilir — səhifə yenilənəndə vacibdir.
 */
export const permissionGuard: CanMatchFn = (route: Route) => {
    const permissions = inject(PermissionService);
    const auth = inject(AuthService);
    const router = inject(Router);

    const pageKeys = routePageKeys(route);

    if (pageKeys.length === 0) return true;
    if (auth.hasRole('Admin')) return true;

    return toObservable(permissions.loaded).pipe(
        filter(loaded => loaded),
        take(1),
        map(() => (pageKeys.some(key => permissions.canShow(key)) ? true : router.parseUrl('/unauthorized')))
    );
};

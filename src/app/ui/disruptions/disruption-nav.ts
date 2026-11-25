import { ActivatedRoute, Router, UrlTree } from '@angular/router';

/**
 * Siyahıdan detala keçəndə siyahının tam URL-i (filtr, səhifə) `back` parametrində ötürülür.
 * Detal səhifəsinin "Siyahıya qayıt" linki bu URL-ə qayıdır, siyahı filtrləri URL-dən bərpa edir.
 */
export const BACK_PARAM = 'back';

/**
 * `back` parametrindən geri linki qurur. Yalnız gözlənilən siyahı yoluna icazə verilir,
 * əks halda (parametr yoxdur, başqa yoldur) `fallback` qaytarılır.
 */
export function backLinkFromQuery(router: Router, route: ActivatedRoute, fallback: string): UrlTree {
    const back = route.snapshot.queryParamMap.get(BACK_PARAM);
    if (back) {
        const tree = router.parseUrl(back);
        const path = '/' + (tree.root.children['primary']?.segments.map(s => s.path).join('/') ?? '');
        if (path === fallback) return tree;
    }
    return router.parseUrl(fallback);
}

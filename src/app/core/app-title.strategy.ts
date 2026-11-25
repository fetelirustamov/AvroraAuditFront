import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Brauzer tabındakı məhsul adı. Məhsul neytraldır: müştəri brendi yazılmır. */
const APP_NAME = 'Audit';

/**
 * Aktiv route zəncirində ən dərindəki səhifə adını qaytarır:
 * əvvəl route-un öz string `title`-ı (detal səhifələri), yoxdursa `data.menu.title`.
 * `data` komponentsiz valideyndən miras qalır, ona görə detal route-unun öz
 * `title`-ı valideynin menyu adından üstündür.
 * Səhifə başlığı və brauzer tabı eyni mənbədən oxuyur.
 */
export function routePageTitle(root: ActivatedRouteSnapshot): string | undefined {
    let title: string | undefined;
    for (let route: ActivatedRouteSnapshot | null = root; route; route = route.firstChild) {
        const menuTitle = route.data?.['menu']?.title;
        const routeTitle = route.routeConfig?.title;
        title = (typeof routeTitle === 'string' && routeTitle)
            || (typeof menuTitle === 'string' && menuTitle)
            || title;
    }
    return title;
}

/**
 * Brauzer tabının adı: "Səhifə · Audit", səhifə adı yoxdursa "Audit".
 * `app.config.ts`-də `TitleStrategy` kimi qeydə alınıb.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);

    override updateTitle(snapshot: RouterStateSnapshot): void {
        const page = routePageTitle(snapshot.root);
        this.title.setTitle(page ? `${page} · ${APP_NAME}` : APP_NAME);
    }
}

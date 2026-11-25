import { Routes } from '@angular/router';
import { MenuMeta } from '../../common/menu/menu.model';

/** İcazə matrisində səhifənin aid olduğu menyu bölməsi. */
export interface PageMenuPlace {
    /** "Tətbiq · İş axını", "Admin paneli · İstifadəçi idarəetməsi". */
    section: string;
    /** Bölmələrin sırası: əvvəl tətbiq, sonra admin, hər birində menyudakı sıra ilə. */
    sectionOrder: number;
    /** Bölmə daxilində sıra. */
    order: number;
}

const AREA_LABEL: Record<MenuMeta['area'], string> = { app: 'Tətbiq', admin: 'Admin paneli' };
const AREA_ORDER: Record<MenuMeta['area'], number> = { app: 0, admin: 1000 };

/**
 * `pageKey` → menyu bölməsi. Mənbə route-ların `data.menu` sahəsidir (menyu ilə eyni),
 * ona görə icazə matrisi sətirləri menyudakı kimi qruplaşır.
 */
export function pageMenuPlaces(...routeTrees: Routes[]): Map<string, PageMenuPlace> {
    const metas: MenuMeta[] = [];
    const walk = (routes: Routes) => {
        for (const route of routes) {
            const meta = route.data?.['menu'] as MenuMeta | undefined;
            if (meta?.pageKey) metas.push(meta);
            if (route.children) walk(route.children);
        }
    };
    routeTrees.forEach(walk);

    // Bölmənin sırası onun ən kiçik bəndinin sırasıdır (MenuService ilə eyni qayda)
    const sectionOrder = new Map<string, number>();
    for (const meta of metas) {
        const section = `${AREA_LABEL[meta.area]} · ${meta.section}`;
        const order = AREA_ORDER[meta.area] + meta.order;
        sectionOrder.set(section, Math.min(sectionOrder.get(section) ?? order, order));
    }

    const places = new Map<string, PageMenuPlace>();
    for (const meta of metas) {
        const section = `${AREA_LABEL[meta.area]} · ${meta.section}`;
        places.set(meta.pageKey.toLowerCase(), {
            section,
            sectionOrder: sectionOrder.get(section)!,
            order: meta.order,
        });
    }
    return places;
}

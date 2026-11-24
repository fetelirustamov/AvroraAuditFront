import { Injectable, Signal, computed, inject } from '@angular/core';
import { Route } from '@angular/router';
import { PermissionService } from '../../auth/permission.service';
import { MenuEntry, MenuGroup, MenuLink, MenuMeta, MenuSection } from './menu.model';

interface FlatItem {
    meta: MenuMeta;
    path: string;
}

/**
 * Route ağacından (mövcud *.routes.ts massivi) icazəyə görə filtrlənmiş menyu qurur.
 *
 * Menyu metadatası route-un `data.menu`-sundadır — vahid mənbə budur. Yeni səhifə
 * əlavə etmək = route-a `data.menu` yazmaq; menyuya, guard-a əlavə əl işi yoxdur.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
    private readonly permissions = inject(PermissionService);

    /**
     * @param basePath Route massivinin bağlı olduğu mütləq prefiks (məs. '/admin', əsas app üçün '').
     * @param routes Skan ediləcək route ağacı (adətən birbaşa idxal olunan *.routes massivi).
     * @returns İcazəyə reaktiv bağlı signal — icazələr yüklənəndə menyu avtomatik yenilənir.
     */
    build(basePath: string, routes: Route[]): Signal<MenuSection[]> {
        const flat = this.flatten(basePath, routes);
        return computed(() => this.assemble(flat));
    }

    private flatten(basePath: string, routes: Route[], acc: FlatItem[] = []): FlatItem[] {
        for (const route of routes) {
            const path = this.join(basePath, route.path);
            const meta = route.data?.['menu'] as MenuMeta | undefined;
            if (meta) acc.push({ meta, path });
            if (route.children) this.flatten(path, route.children, acc);
        }
        return acc;
    }

    private assemble(flat: FlatItem[]): MenuSection[] {
        const visible = flat.filter(f => this.permissions.canShow(f.meta.pageKey));
        const sections = new Map<string, MenuSection>();

        for (const { meta, path } of visible) {
            const section = this.sectionOf(sections, meta);
            const link: MenuLink = {
                kind: 'link',
                title: meta.title,
                path,
                pageKey: meta.pageKey,
                icon: meta.icon,
                order: meta.order,
            };

            if (meta.group) {
                const group = this.groupOf(section, meta);
                group.items.push(link);
                group.order = Math.min(group.order, meta.groupOrder ?? meta.order);
            } else {
                section.entries.push(link);
            }
            section.order = Math.min(section.order, meta.order);
        }

        const result = [...sections.values()];
        for (const s of result) {
            s.entries.sort((a, b) => a.order - b.order);
            for (const e of s.entries) {
                if (e.kind === 'group') e.items.sort((a, b) => a.order - b.order);
            }
        }
        return result.sort((a, b) => a.order - b.order);
    }

    private sectionOf(map: Map<string, MenuSection>, meta: MenuMeta): MenuSection {
        let section = map.get(meta.section);
        if (!section) {
            section = { label: meta.section, order: meta.order, entries: [] };
            map.set(meta.section, section);
        }
        return section;
    }

    private groupOf(section: MenuSection, meta: MenuMeta): MenuGroup {
        let group = section.entries.find(
            (e): e is MenuGroup => e.kind === 'group' && e.title === meta.group
        );
        if (!group) {
            group = {
                kind: 'group',
                title: meta.group!,
                icon: meta.groupIcon,
                order: meta.groupOrder ?? meta.order,
                items: [],
            };
            section.entries.push(group);
        }
        return group;
    }

    /** Mütləq prefiksi route yolu ilə birləşdirir (boş/`/` seqmentlərini təmizləyir). */
    private join(base: string, path?: string): string {
        const clean = (path ?? '').replace(/^\/+|\/+$/g, '');
        const b = base.replace(/\/+$/g, '');
        if (!clean) return b || '/';
        return `${b}/${clean}`;
    }
}

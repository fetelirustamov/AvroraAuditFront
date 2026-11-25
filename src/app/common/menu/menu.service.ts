import { Injectable, Signal, computed, inject } from '@angular/core';
import { Route } from '@angular/router';
import { PermissionService } from '../../auth/permission.service';
import { MenuEntry, MenuGroup, MenuLink, MenuMeta, MenuSection } from './menu.model';

interface FlatItem {
    meta: MenuMeta;
    path: string;
    matchPaths: string[];
}

/**
 * Route ağacından icazəyə görə filtrlənmiş menyu qurur.
 *
 * Menyu metadatası route-un `data.menu`-sundadır — vahid mənbə budur. Yeni səhifə
 * əlavə etmək = route-a `data.menu` yazmaq; menyuya, guard-a əlavə əl işi yoxdur.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
    private readonly permissions = inject(PermissionService);

    /**
     * @param basePath Route massivinin bağlı olduğu mütləq prefiks (məs. '/admin', əsas tətbiq üçün '').
     * @param routes Skan ediləcək route ağacı (shell route-unun `children`-i).
     * @returns İcazəyə reaktiv bağlı signal — icazələr yüklənəndə menyu avtomatik yenilənir.
     */
    build(basePath: string, routes: Route[]): Signal<MenuSection[]> {
        const flat = this.flatten(basePath, basePath, routes);
        return computed(() => this.assemble(flat));
    }

    /**
     * URL-ə uyğun menyu bəndi: `matchPaths`-dan URL-in seqment prefiksi olan ən uzunu qalib gəlir.
     * Beləliklə `/disruptions/details` "Uyğunsuzluqlar"-ı, `/disruptions/tracking` isə öz bəndini aktiv edir.
     */
    findActive(sections: MenuSection[], url: string): MenuLink | undefined {
        const path = url.split(/[?#;]/)[0];
        let best: MenuLink | undefined;
        let bestLength = -1;

        for (const link of this.links(sections)) {
            for (const candidate of link.matchPaths) {
                const matches = path === candidate || path.startsWith(candidate + '/');
                if (matches && candidate.length > bestLength) {
                    best = link;
                    bestLength = candidate.length;
                }
            }
        }
        return best;
    }

    /** Menyudakı bütün linklər (qrup içindəkilər daxil). */
    links(sections: MenuSection[]): MenuLink[] {
        return sections.flatMap(s => s.entries.flatMap(e => e.kind === 'group' ? e.items : [e]));
    }

    private flatten(rootPath: string, basePath: string, routes: Route[], acc: FlatItem[] = []): FlatItem[] {
        for (const route of routes) {
            const path = this.join(basePath, route.path);
            const meta = route.data?.['menu'] as MenuMeta | undefined;
            if (meta) {
                const also = (meta.activeAlso ?? []).map(p => this.join(rootPath, p));
                acc.push({ meta, path, matchPaths: [path, ...also] });
            }
            if (route.children) this.flatten(rootPath, path, route.children, acc);
        }
        return acc;
    }

    private assemble(flat: FlatItem[]): MenuSection[] {
        const visible = flat.filter(f => this.permissions.canShow(f.meta.pageKey));
        const sections = new Map<string, MenuSection>();

        for (const { meta, path, matchPaths } of visible) {
            const section = this.sectionOf(sections, meta);
            const link: MenuLink = {
                kind: 'link',
                title: meta.title,
                path,
                matchPaths,
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
            s.entries = s.entries.map(e => this.flattenSingle(e)).sort((a, b) => a.order - b.order);
            for (const e of s.entries) {
                if (e.kind === 'group') e.items.sort((a, b) => a.order - b.order);
            }
        }
        return result.sort((a, b) => a.order - b.order);
    }

    /** Tək bəndi olan qrup açılan panel deyil, adi link kimi göstərilir (qrupun ikonu ilə). */
    private flattenSingle(entry: MenuEntry): MenuEntry {
        if (entry.kind !== 'group' || entry.items.length !== 1) return entry;
        const [only] = entry.items;
        return { ...only, icon: only.icon ?? entry.icon, order: entry.order };
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

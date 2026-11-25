import { Component, computed, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MenuGroup, MenuLink, MenuSection } from '../menu/menu.model';
import { ShellArea } from '../shell/shell.model';

/**
 * Menyu paneli. Vəziyyəti shell idarə edir:
 *  - `rail`: desktop-da dar ikon zolağı (hover/fokusla tam açılır);
 *  - `open`: <1200px-də drawer açıqdır (fokus içində tutulur).
 * Aktiv bənd URL-dən hesablanır (MenuService.findActive), routerLinkActive işlənmir:
 * belə detal səhifələrində də uyğun bənd seçilmiş qalır.
 */
@Component({
    selector: 'app-sidebar',
    imports: [NgScrollbarModule, MatExpansionModule, RouterLink, CdkTrapFocus],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss',
    host: {
        '[class.is-rail]': 'rail()',
        '[class.is-open]': 'open()',
    },
})
export class SidebarComponent {
    readonly area = input.required<ShellArea>();
    readonly menu = input.required<MenuSection[]>();
    readonly activeLink = input<MenuLink | undefined>();
    readonly rail = input(false);
    readonly open = input(false);

    readonly closeRequest = output<void>();

    private readonly trap = viewChild.required(CdkTrapFocus);

    readonly homePath = computed(() => this.area() === 'admin' ? '/admin' : '/');
    readonly navLabel = computed(() => this.area() === 'admin' ? 'Admin menyusu' : 'Əsas menyu');

    isActive(link: MenuLink): boolean {
        return link.path === this.activeLink()?.path;
    }

    hasActive(group: MenuGroup): boolean {
        return group.items.some(item => this.isActive(item));
    }

    /** Drawer açılanda fokusu panelin ilk elementinə köçürür. */
    focusFirst(): void {
        this.trap().focusTrap.focusFirstTabbableElementWhenReady();
    }
}

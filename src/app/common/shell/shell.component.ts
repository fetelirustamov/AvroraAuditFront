import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map, tap } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MenuService } from '../menu/menu.service';
import { ShellArea } from './shell.model';

/** Bu endən yuxarıda sidebar sabitdir (rail ola bilir), aşağıda üstə açılan drawer-dir. SCSS-də də eyni sərhəd. */
const DESKTOP_QUERY = '(min-width: 1200px)';
const COLLAPSED_KEY = 'shell.sidebar-collapsed';

/**
 * Əsas tətbiqin və admin panelinin ortaq çərçivəsi: sidebar + header + məzmun.
 *
 * Bölmə route-un `data.area`-sından, menyu isə bu route-un `children`-indən
 * (`data.menu`) qurulur. Ona görə səhifə route faylları shell-i import etmir.
 */
@Component({
    selector: 'app-shell',
    imports: [RouterOutlet, HeaderComponent, SidebarComponent],
    templateUrl: './shell.component.html',
    // admin-area.scss yalnız `.admin-area` daxilində təsir edir: admin səhifələrinin forma/cədvəl stilləri
    styleUrls: ['./shell.component.scss', './admin-area.scss'],
    host: {
        '(document:keydown.escape)': 'closeDrawer()',
    },
})
export class ShellComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly menuService = inject(MenuService);
    private readonly breakpoints = inject(BreakpointObserver);

    private readonly header = viewChild.required(HeaderComponent);
    private readonly sidebar = viewChild.required(SidebarComponent);

    readonly area: ShellArea = this.route.snapshot.data['area'];

    readonly menu = this.menuService.build(this.basePath(), this.route.routeConfig?.children ?? []);

    private readonly nav = toSignal(
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            map(() => this.readNavigation()),
        ),
        { initialValue: this.readNavigation() },
    );

    readonly activeLink = computed(() => this.menuService.findActive(this.menu(), this.nav().url));

    /** İstifadəçinin desktop seçimi: dar rail və ya tam panel. Yadda saxlanır. */
    private readonly collapsed = signal(readCollapsed());
    // isDesktop-dan əvvəl elan olunur: breakpoint axını abunə anında emit edib bunu yazır
    private readonly drawerOpen = signal(false);

    readonly isDesktop = toSignal(
        this.breakpoints.observe(DESKTOP_QUERY).pipe(
            map(state => state.matches),
            // Ölçü dəyişəndə açıq qalmış drawer növbəti dəfə özbaşına görünməsin
            tap(() => this.drawerOpen.set(false)),
        ),
        { initialValue: this.breakpoints.isMatched(DESKTOP_QUERY) },
    );

    readonly rail = computed(() => this.isDesktop() && this.collapsed());
    readonly drawer = computed(() => !this.isDesktop() && this.drawerOpen());
    readonly menuExpanded = computed(() => this.isDesktop() ? !this.collapsed() : this.drawerOpen());

    constructor() {
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            takeUntilDestroyed(),
        ).subscribe(() => this.closeDrawer());
    }

    toggleMenu(): void {
        if (this.isDesktop()) {
            const next = !this.collapsed();
            this.collapsed.set(next);
            writeCollapsed(next);
        } else if (this.drawerOpen()) {
            this.closeDrawer();
        } else {
            this.drawerOpen.set(true);
            this.sidebar().focusFirst();
        }
    }

    closeDrawer(): void {
        if (!this.drawerOpen()) return;
        this.drawerOpen.set(false);
        this.header().focusMenuButton();
    }

    /** Shell route-unun mütləq yolu ('' və ya '/admin'): menyu linkləri buna nisbətən qurulur. */
    private basePath(): string {
        const segments = this.route.pathFromRoot
            .map(r => r.routeConfig?.path)
            .filter((p): p is string => !!p);
        return segments.length ? '/' + segments.join('/') : '';
    }

    private readNavigation(): { url: string } {
        return { url: this.router.url };
    }
}

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function writeCollapsed(value: boolean): void {
    try {
        localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
    } catch {
        // Yaddaş bağlıdırsa (məs. məxfi rejim), seçim yalnız bu sessiyada qalır
    }
}

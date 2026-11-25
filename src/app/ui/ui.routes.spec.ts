import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { permissionGuard, routePageKeys } from '../auth/guards/permission.guard';
import { PermissionService } from '../auth/permission.service';
import { uiRoutes } from './ui.routes';

/** Shell-in altındakı bütün route-lar, tam yolu ilə. */
function flatten(routes: Route[], base = ''): { path: string; route: Route }[] {
    return routes.flatMap(route => {
        const path = [base, route.path].filter(Boolean).join('/');
        return [{ path, route }, ...flatten(route.children ?? [], path)];
    });
}

const pages = flatten(uiRoutes[0].children ?? []);
const find = (path: string) => pages.find(p => p.path === path && (p.route.loadComponent || p.route.children))!.route;
const isGuarded = (route: Route) => (route.canMatch ?? []).includes(permissionGuard);

describe('uiRoutes icazə qatı', () => {
    it('açarı olan hər səhifəyə guard qoşur, açarsız valideynə yox', () => {
        for (const { path, route } of pages) {
            const keys = routePageKeys(route);
            const expected = keys.length > 0 && !keys.includes('dashboard');
            expect(isGuarded(route)).withContext(path).toBe(expected);
        }
    });

    it('alt səhifə ana bölmənin yox, öz açarı ilə qorunur', () => {
        expect(routePageKeys(find('inspections'))).toEqual([]);
        expect(routePageKeys(find('inspections/approve'))).toEqual(['inspection-approve']);
        expect(routePageKeys(find('disruptions'))).toEqual([]);
        expect(routePageKeys(find('disruptions/tracking'))).toEqual(['disruption-tracking']);
        expect(routePageKeys(find('answers'))).toEqual([]);
        expect(routePageKeys(find('answers/approve'))).toEqual(['answer-approve']);
    });

    it('yüklənən hər səhifənin açarı var (gizli hesabat və Əsas səhifə istisna)', () => {
        const open = pages
            .filter(p => p.route.loadComponent && !p.route.children && routePageKeys(p.route).length === 0)
            .map(p => p.path);
        // `reports` menyuya qəsdən salınmayıb (reports-location, CLAUDE.md)
        expect(open).toEqual(['reports']);
    });
});

describe('permissionGuard', () => {
    const allowed = new Set<string>();

    beforeEach(() => {
        allowed.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasRole: () => false } },
                {
                    provide: PermissionService,
                    useValue: { loaded: signal(true), canShow: (key: string) => allowed.has(key) },
                },
            ],
        });
    });

    async function run(route: Route): Promise<boolean | UrlTree> {
        const result = TestBed.runInInjectionContext(() => permissionGuard(route, []));
        return isObservable(result) ? firstValueFrom(result as Observable<boolean | UrlTree>) : (result as boolean);
    }

    it('açarlardan birinə icazə kifayətdir', async () => {
        allowed.add('inspection-approve');
        expect(await run(find('inspections/details'))).toBeTrue();
    });

    it('icazə yoxdursa «İcazə yoxdur» səhifəsinə yönləndirir', async () => {
        allowed.add('inspections');
        const result = await run(find('inspections/approve'));
        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/unauthorized');
    });
});

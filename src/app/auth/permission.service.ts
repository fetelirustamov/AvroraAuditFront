import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type PageAction = 'show' | 'add' | 'edit' | 'delete';

/** Backend `GET /api/me/permissions` cavabının forması (bir səhifə üzrə yekun icazə). */
export interface UserPagePermission {
    pageKey: string;
    canShow: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

/**
 * Cari istifadəçinin səhifə icazələrini backenddən çəkib saxlayır.
 * Menyu (MenuService), route guard-ı (permissionGuard) və düymə direktivi
 * (*hasPermission) bu servisi vahid mənbə kimi istifadə edir.
 *
 * Yükləmə auth vəziyyətinə bağlıdır: istifadəçi login olanda avtomatik çəkilir,
 * logout olanda təmizlənir. Bu ötürmə tək istiqamətlidir (PermissionService ->
 * AuthService), ona görə dövri asılılıq (circular DI) yaranmır.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(AuthService);
    private readonly baseUrl = environment.apiUrl;

    // pageKey (kiçik hərflə) -> icazə. Signal-dır ki, menyu və UI avtomatik yenilənsin.
    private readonly permissions = signal<Map<string, UserPagePermission>>(new Map());

    /** İcazələr backenddən (ən azı bir dəfə) çəkildikdə true olur. Guard bunu gözləyir. */
    readonly loaded = signal(false);

    /** Admin (super-rol) hər şeyi görür - reaktiv bypass. */
    private readonly isSuper = computed(() => this.auth.hasRole('Admin'));

    constructor() {
        // İcazələr auth vəziyyətinə bağlıdır. BehaviorSubject son dəyəri təkrar
        // ötürdüyü üçün səhifə yenilənəndə (token mövcud) də düzgün işləyir.
        this.auth.currentUser$.subscribe(user => {
            if (user) {
                this.load().subscribe();
            } else {
                this.clear();
            }
        });
    }

    /** Backenddən icazələri çəkir. Cavab array və ya {data:[]} formasında ola bilər. */
    load(): Observable<UserPagePermission[]> {
        return this.http.get<any>(`${this.baseUrl}/me/permissions`).pipe(
            tap(res => {
                const list: UserPagePermission[] = Array.isArray(res) ? res : (res?.data ?? []);
                const map = new Map<string, UserPagePermission>();
                for (const p of list) {
                    if (p?.pageKey) map.set(p.pageKey.toLowerCase(), p);
                }
                this.permissions.set(map);
                this.loaded.set(true);
            }),
            // İcazə çəkilməsi menyunu bloklamamalıdır; xəta olsa boş setlə davam edir.
            catchError(() => {
                this.permissions.set(new Map());
                this.loaded.set(true);
                return of([] as UserPagePermission[]);
            })
        );
    }

    clear(): void {
        this.permissions.set(new Map());
        this.loaded.set(false);
    }

    private lookup(pageKey: string): UserPagePermission | undefined {
        return pageKey ? this.permissions().get(pageKey.toLowerCase()) : undefined;
    }

    canShow(pageKey: string): boolean {
        return this.isSuper() || !!this.lookup(pageKey)?.canShow;
    }

    canAdd(pageKey: string): boolean {
        return this.isSuper() || !!this.lookup(pageKey)?.canAdd;
    }

    canEdit(pageKey: string): boolean {
        return this.isSuper() || !!this.lookup(pageKey)?.canEdit;
    }

    canDelete(pageKey: string): boolean {
        return this.isSuper() || !!this.lookup(pageKey)?.canDelete;
    }

    can(pageKey: string, action: PageAction): boolean {
        switch (action) {
            case 'show': return this.canShow(pageKey);
            case 'add': return this.canAdd(pageKey);
            case 'edit': return this.canEdit(pageKey);
            case 'delete': return this.canDelete(pageKey);
        }
    }
}

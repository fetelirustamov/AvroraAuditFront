import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Header-də göstərilən istifadəçi kimliyi.
 *
 * Əvvəl bu məntiq admin header-də yazılmışdı, əsas app header-i isə hər
 * istifadəçi üçün statik `male-avatar.svg` və sərt kodlanmış
 * "Marketing Manager" mətnini göstərirdi. İki header eyni mənbədən (JWT
 * claims: Name, Surname, Role, Email) oxuduğu üçün məntiq buraya çıxarıldı.
 */
@Injectable({ providedIn: 'root' })
export class UserProfileService {

    /** JWT-dəki texniki rol adlarının göstəriş qarşılığı */
    private static readonly ROLE_LABELS: Record<string, string> = {
        Admin: 'Administrator',
        HeadInspector: 'Baş müfəttiş',
        Inspector: 'Müfəttiş',
    };

    constructor(private authService: AuthService) { }

    private get claims(): Record<string, unknown> | null {
        return this.authService.getUserInfo();
    }

    /** Header düyməsində: ad, yoxdursa email */
    get triggerLabel(): string {
        const u = this.claims;
        if (!u) return '';
        const name = u['Name'];
        if (typeof name === 'string' && name.trim()) return name.trim();
        const email = u['Email'];
        return typeof email === 'string' ? email : '';
    }

    /** Dropdown başlığı: tam ad */
    get fullName(): string {
        const u = this.claims;
        if (!u) return '';
        const parts = [u['Name'], u['Surname']]
            .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
            .map(x => x.trim());
        if (parts.length) return parts.join(' ');
        const email = u['Email'];
        return typeof email === 'string' ? email : '';
    }

    /** Ad baş hərfləri (ilk iki söz) */
    get initials(): string {
        const name = this.fullName || this.triggerLabel;
        if (!name) return '?';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
        return initials || '?';
    }

    /** Baş hərflərdən inline SVG avatar (data URL) — real profil şəkli olmadıqda */
    get avatarDataUrl(): string {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">`
            + `<rect width="64" height="64" rx="32" fill="#605DFF"/>`
            + `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" `
            + `font-size="26" font-weight="600" fill="#ffffff">${this.initials}</text></svg>`;
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    /** Rol sətri — JWT Role vergüllə ayrılmış ola bilər */
    get roleLine(): string {
        const u = this.claims;
        if (!u) return '';
        const role = u['Role'];
        if (typeof role !== 'string' || !role.trim()) return '';
        return role
            .split(',')
            .map(r => r.trim())
            .filter(Boolean)
            .map(r => UserProfileService.ROLE_LABELS[r] ?? r)
            .join(', ');
    }
}

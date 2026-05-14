import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(private auth: AuthService, private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (!this.auth.isAuthenticated()) {
            this.router.navigate(['/admin-login'], { queryParams: { returnUrl: state.url } });
            return false;
        }
        if (this.auth.hasRole('Admin')) {
            return true;
        }
        this.router.navigate(['/admin-login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
} 
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const requiredRoles = route.data['roles'] as string[];


        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return false;
        }

        const hasRole = this.authService.hasAnyRole(requiredRoles);


        if (hasRole) {
            return true;
        }

        // If user doesn't have required role, redirect to unauthorized page
        this.router.navigate(['/unauthorized']);
        return false;
    }
} 
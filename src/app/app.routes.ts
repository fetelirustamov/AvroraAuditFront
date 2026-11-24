import { Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';
import { AdminGuard } from './auth/guards/admin.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./authentication/sign-in/sign-in.component').then(m => m.SignInComponent)
    },
    {
        path: 'admin-login',
        loadComponent: () => import('./admin/pages/auth/admin-login.component').then(m => m.AdminLoginComponent)
    },
    {
        path: 'unauthorized',
        loadComponent: () => import('./common/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes),
        canActivate: [AdminGuard]
    },
    {
        path: '',
        loadChildren: () => import('./ui/ui.routes').then(m => m.uiRoutes),
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        loadComponent: () => import('./not-found/not-found.component').then(m => m.NotFoundComponent)
    }
];

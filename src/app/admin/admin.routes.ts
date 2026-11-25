import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { adminPageRoutes } from './admin-pages.routes';
import { SHELL_PROVIDERS } from '../core/shell-providers';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminComponent,
        canActivate: [AuthGuard],
        providers: SHELL_PROVIDERS,
        data: {
            title: 'Admin paneli',
            breadcrumb: 'Admin'
        },
        children: adminPageRoutes
    }
];

import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { adminPageRoutes } from './admin-pages.routes';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: {
            title: 'Admin Panel',
            breadcrumb: 'Admin'
        },
        children: adminPageRoutes
    }
];

import { Routes } from '@angular/router';
import { ShellComponent } from '../common/shell/shell.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { adminPageRoutes } from './admin-pages.routes';
import { SHELL_PROVIDERS } from '../core/shell-providers';

export const adminRoutes: Routes = [
    {
        path: '',
        component: ShellComponent,
        canActivate: [AuthGuard],
        providers: SHELL_PROVIDERS,
        data: { area: 'admin' },
        children: adminPageRoutes
    }
];

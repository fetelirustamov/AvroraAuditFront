import { Routes } from '@angular/router';
import { UiComponent } from './ui.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { uiPageRoutes } from './ui-pages.routes';

export const uiRoutes: Routes = [
    {
        path: '',
        component: UiComponent,
        canActivate: [AuthGuard],
        children: uiPageRoutes,
    },
];

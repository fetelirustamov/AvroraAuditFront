import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component'; // standalone
import { AdminComponent } from './admin.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionComponent } from './pages/permission/permission.component';

export const adminRoutes: Routes = [
    {
        path: '',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: {
            title: 'Admin Panel',
            breadcrumb: 'Admin'
        },
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                component: DashboardComponent,
                data: { title: 'Admin Dashboard' }
            },

            {
                path: 'permissions',
                component: PermissionComponent,
                data: { title: 'İstifadəçi İcazələri' },
                children: [
                    { path: '', redirectTo: 'structure', pathMatch: 'full' },
                    {
                        path: 'structure',
                        loadComponent: () => import('./pages/permission/location-structure/location-structure.component')
                            .then(m => m.LocationStructureComponent),
                        data: { title: 'Ərazi Bağlantıları' }
                    },
                    {
                        path: 'user-permission',
                        loadComponent: () => import('./pages/permission/user-permission/user-permission.component')
                            .then(m => m.UserPermissionComponent),
                        data: { title: 'İstifadəçi İcazələri' }
                    },
                    {
                        path: 'permission-groups',
                        loadComponent: () => import('./pages/permission/permission-groups/permission-groups.component')
                            .then(m => m.PermissionGroupsComponent),
                        data: { title: 'Səlahiyyət qrupları' }
                    },
                    {
                        path: 'permission-groups/add',
                        loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                            .then(m => m.GroupsAddComponent),
                        data: { title: 'Yeni qrup' }
                    },
                    {
                        path: 'permission-groups/edit/:id',
                        loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                            .then(m => m.GroupsAddComponent),
                        data: { title: 'Qrup redaktəsi' }
                    },
                    {
                        path: 'permission-groups/view/:id',
                        loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                            .then(m => m.GroupsAddComponent),
                        data: { title: 'Qrup detalları' }
                    },
                    {
                        path: 'user-add',
                        loadComponent: () => import('./pages/permission/user-add/user-add.component')
                            .then(m => m.UserAddComponent),
                        data: { title: 'Yeni İstifadəçi' }
                    }
                ]

            },
            {
                path: 'questions',
                loadComponent: () => import('./pages/questions/questions.component')
                    .then(m => m.QuestionsComponent),
                data: { title: 'Suallar' }
            },
            {
                path: 'questions/add',
                loadComponent: () => import('./pages/questions/add/question-add.component')
                    .then(m => m.QuestionAddComponent),
                data: { title: 'Yeni Sual' }
            },
            {
                path: 'questions/edit/:id',
                loadComponent: () => import('./pages/questions/add/question-add.component')
                    .then(m => m.QuestionAddComponent),
                data: { title: 'Sual redaktəsi' }
            },
            {
                path: 'questions/view/:id',
                loadComponent: () => import('./pages/questions/add/question-add.component')
                    .then(m => m.QuestionAddComponent),
                data: { title: 'Sual detalları' }
            },
            {
                path: 'master-data',
                loadComponent: () => import('./pages/master-data/master-data.component')
                    .then(m => m.MasterDataComponent),
                data: { title: 'Şöbələr və Kateqoriyalar' }
            },
            {
                path: 'categories',
                redirectTo: 'master-data',
                pathMatch: 'full'
            },
            {
                path: 'categories/add',
                loadComponent: () => import('./pages/categories/add/category-add.component')
                    .then(m => m.CategoryAddComponent),
                data: { title: 'Yeni Kateqoriya' }
            },
            {
                path: 'locations',
                loadComponent: () => import('./pages/locations/locations.component')
                    .then(m => m.LocationsComponent),
                data: { title: 'Mağazalar' }
            },
            {
                path: 'locations/add',
                loadComponent: () => import('./pages/locations/add/location-add.component')
                    .then(m => m.LocationAddComponent),
                data: { title: 'Yeni Mağaza' }
            },
            {
                path: 'sections',
                redirectTo: 'master-data',
                pathMatch: 'full'
            },
            {
                path: 'sections/add',
                loadComponent: () => import('./pages/sections/add/section-add.component')
                    .then(m => m.SectionAddComponent),
                data: { title: 'Yeni Şöbə' }
            },
            {
                path: 'sections/edit/:id',
                loadComponent: () => import('./pages/sections/add/section-add.component')
                    .then(m => m.SectionAddComponent),
                data: { title: 'Şöbə Redaktəsi' }
            },
            {
                path: 'sections/view/:id',
                loadComponent: () => import('./pages/sections/add/section-add.component')
                    .then(m => m.SectionAddComponent),
                data: { title: 'Şöbə Detalları' }
            },
            {
                path: 'pages',
                loadComponent: () => import('./pages/page/page.component')
                    .then(m => m.PageComponent),
                data: { title: 'Səhifələr' }
            }
            // digər admin routelar buraya əlavə oluna bilər
        ]
    }
];

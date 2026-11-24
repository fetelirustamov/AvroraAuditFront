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
                data: {
                    title: 'Admin Dashboard',
                    menu: {
                        area: 'admin', section: 'ƏSAS', order: 0,
                        title: 'Dashboard', icon: 'dashboard', pageKey: 'admin-dashboard'
                    }
                }
            },

            {
                path: 'permissions',
                component: PermissionComponent,
                data: { title: 'İstifadəçilər' },
                children: [
                    { path: '', redirectTo: 'structure', pathMatch: 'full' },
                    {
                        path: 'structure',
                        loadComponent: () => import('./pages/permission/location-structure/location-structure.component')
                            .then(m => m.LocationStructureComponent),
                        data: {
                            title: 'Ərazi Bağlantıları',
                            menu: {
                                area: 'admin', section: 'İSTİFADƏÇİ İDARƏETMƏSİ', order: 13,
                                group: 'İstifadəçilər və İcazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                                title: 'Ərazi Bağlantıları', pageKey: 'location-structure'
                            }
                        }
                    },
                    {
                        path: 'user-permission',
                        loadComponent: () => import('./pages/permission/user-permission/user-permission.component')
                            .then(m => m.UserPermissionComponent),
                        data: {
                            title: 'İstifadəçilər',
                            menu: {
                                area: 'admin', section: 'İSTİFADƏÇİ İDARƏETMƏSİ', order: 10,
                                group: 'İstifadəçilər və İcazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                                title: 'İstifadəçilər', pageKey: 'users'
                            }
                        }
                    },
                    {
                        path: 'permission-groups',
                        loadComponent: () => import('./pages/permission/permission-groups/permission-groups.component')
                            .then(m => m.PermissionGroupsComponent),
                        data: {
                            title: 'Səlahiyyət qrupları',
                            menu: {
                                area: 'admin', section: 'İSTİFADƏÇİ İDARƏETMƏSİ', order: 12,
                                group: 'İstifadəçilər və İcazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                                title: 'Səlahiyyət qrupları', pageKey: 'permission-groups'
                            }
                        }
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
                        data: {
                            title: 'İstifadəçi səlahiyyətləri',
                            menu: {
                                area: 'admin', section: 'İSTİFADƏÇİ İDARƏETMƏSİ', order: 11,
                                group: 'İstifadəçilər və İcazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                                title: 'Rol və Firma Təyinatı', pageKey: 'user-roles'
                            }
                        }
                    },
                    {
                        path: 'user-create',
                        redirectTo: 'user-permission',
                        pathMatch: 'full'
                    }
                ]

            },
            {
                path: 'questions',
                loadComponent: () => import('./pages/questions/questions.component')
                    .then(m => m.QuestionsComponent),
                data: {
                    title: 'Suallar',
                    menu: {
                        area: 'admin', section: 'SİSTEM PARAMETRLƏRİ', order: 21,
                        group: 'Əsas Məlumatlar', groupIcon: 'settings', groupOrder: 20,
                        title: 'Suallar', pageKey: 'questions'
                    }
                }
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
                data: {
                    title: 'Audit Strukturu',
                    menu: {
                        area: 'admin', section: 'SİSTEM PARAMETRLƏRİ', order: 20,
                        group: 'Əsas Məlumatlar', groupIcon: 'settings', groupOrder: 20,
                        title: 'Audit Strukturu', pageKey: 'master-data'
                    }
                }
            },
            {
                path: 'categories',
                redirectTo: 'master-data',
                pathMatch: 'full'
            },
            {
                path: 'locations',
                redirectTo: 'master-data',
                pathMatch: 'full'
            },
            {
                path: 'sections',
                redirectTo: 'master-data',
                pathMatch: 'full'
            },
            {
                path: 'pages',
                loadComponent: () => import('./pages/page/page.component')
                    .then(m => m.PageComponent),
                data: {
                    title: 'Səhifələr',
                    menu: {
                        area: 'admin', section: 'SİSTEM PARAMETRLƏRİ', order: 23,
                        group: 'Əsas Məlumatlar', groupIcon: 'settings', groupOrder: 20,
                        title: 'Səhifələr', pageKey: 'pages'
                    }
                }
            },
            {
                path: 'firms',
                loadComponent: () => import('./pages/firms/firms.component')
                    .then(m => m.FirmsComponent),
                data: {
                    title: 'Firmalar',
                    menu: {
                        area: 'admin', section: 'SİSTEM PARAMETRLƏRİ', order: 22,
                        group: 'Əsas Məlumatlar', groupIcon: 'settings', groupOrder: 20,
                        title: 'Firmalar', pageKey: 'firms'
                    }
                }
            }
            // digər admin routelar buraya əlavə oluna bilər
        ]
    }
];

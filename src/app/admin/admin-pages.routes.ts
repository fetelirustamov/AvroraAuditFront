import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component'; // standalone

// Shell komponentini import etmir: admin.routes.ts bu massivi shell-ə uşaq kimi verir,
// shell menyunu öz route-unun `children`-indən qurur.
// Səhifə adı menyu bəndlərində `data.menu.title`-dan, menyusuz səhifələrdə (əlavə, redaktə)
// route-un `title`-ından gəlir: brauzer tabı və <app-page-header> eyni adı göstərir.
// Menyusuz alt səhifələr öz siyahısının yolunun altındadır, ona görə menyuda siyahı aktiv qalır.
export const adminPageRoutes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: DashboardComponent,
        data: {
            menu: {
                area: 'admin', section: 'Əsas', order: 0,
                title: 'Əsas səhifə', icon: 'dashboard', pageKey: 'admin-dashboard'
            }
        }
    },

    {
        path: 'permissions',
        children: [
            { path: '', redirectTo: 'structure', pathMatch: 'full' },
            {
                path: 'structure',
                loadComponent: () => import('./pages/permission/location-structure/location-structure.component')
                    .then(m => m.LocationStructureComponent),
                data: {
                    menu: {
                        area: 'admin', section: 'İstifadəçi idarəetməsi', order: 13,
                        group: 'İstifadəçilər və icazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                        title: 'Ərazi bağlantıları', pageKey: 'location-structure'
                    }
                }
            },
            {
                path: 'user-permission',
                loadComponent: () => import('./pages/permission/user-permission/user-permission.component')
                    .then(m => m.UserPermissionComponent),
                data: {
                    menu: {
                        area: 'admin', section: 'İstifadəçi idarəetməsi', order: 10,
                        group: 'İstifadəçilər və icazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                        title: 'İstifadəçilər', pageKey: 'users'
                    }
                }
            },
            {
                // İstifadəçi redaktəsi: şəxsi məlumatlar, status, firmalar, icazə qrupu, parol
                path: 'user-permission/:userCode',
                title: 'İstifadəçi redaktəsi',
                loadComponent: () => import('./pages/permission/user-add/user-add.component')
                    .then(m => m.UserAddComponent)
            },
            {
                path: 'permission-groups',
                loadComponent: () => import('./pages/permission/permission-groups/permission-groups.component')
                    .then(m => m.PermissionGroupsComponent),
                data: {
                    menu: {
                        area: 'admin', section: 'İstifadəçi idarəetməsi', order: 12,
                        group: 'İstifadəçilər və icazələr', groupIcon: 'inbox_text_person', groupOrder: 10,
                        title: 'İcazə qrupları', pageKey: 'permission-groups'
                    }
                }
            },
            {
                path: 'permission-groups/add',
                title: 'Yeni icazə qrupu',
                loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                    .then(m => m.GroupsAddComponent)
            },
            {
                path: 'permission-groups/edit/:id',
                title: 'İcazə qrupu redaktəsi',
                loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                    .then(m => m.GroupsAddComponent)
            },
            {
                path: 'permission-groups/view/:id',
                title: 'İcazə qrupu',
                loadComponent: () => import('./pages/permission/permission-groups/groups-add/groups-add.component')
                    .then(m => m.GroupsAddComponent)
            }
        ]
    },
    {
        path: 'questions',
        loadComponent: () => import('./pages/questions/questions.component')
            .then(m => m.QuestionsComponent),
        data: {
            menu: {
                area: 'admin', section: 'Sistem parametrləri', order: 21,
                group: 'Əsas məlumatlar', groupIcon: 'settings', groupOrder: 20,
                title: 'Suallar', pageKey: 'questions'
            }
        }
    },
    {
        path: 'questions/add',
        title: 'Yeni sual',
        loadComponent: () => import('./pages/questions/add/question-add.component')
            .then(m => m.QuestionAddComponent)
    },
    {
        path: 'questions/edit/:id',
        title: 'Sual redaktəsi',
        loadComponent: () => import('./pages/questions/add/question-add.component')
            .then(m => m.QuestionAddComponent)
    },
    {
        path: 'questions/view/:id',
        title: 'Sual',
        loadComponent: () => import('./pages/questions/add/question-add.component')
            .then(m => m.QuestionAddComponent)
    },
    {
        path: 'master-data',
        loadComponent: () => import('./pages/master-data/master-data.component')
            .then(m => m.MasterDataComponent),
        data: {
            menu: {
                area: 'admin', section: 'Sistem parametrləri', order: 20,
                group: 'Əsas məlumatlar', groupIcon: 'settings', groupOrder: 20,
                title: 'Audit strukturu', pageKey: 'master-data'
            }
        }
    },
    {
        path: 'pages',
        loadComponent: () => import('./pages/page/page.component')
            .then(m => m.PageComponent),
        data: {
            menu: {
                area: 'admin', section: 'Sistem parametrləri', order: 23,
                group: 'Əsas məlumatlar', groupIcon: 'settings', groupOrder: 20,
                title: 'Səhifələr', pageKey: 'pages'
            }
        }
    },
    {
        path: 'firms',
        loadComponent: () => import('./pages/firms/firms.component')
            .then(m => m.FirmsComponent),
        data: {
            menu: {
                area: 'admin', section: 'Sistem parametrləri', order: 22,
                group: 'Əsas məlumatlar', groupIcon: 'settings', groupOrder: 20,
                title: 'Firmalar', pageKey: 'firms'
            }
        }
    }
];

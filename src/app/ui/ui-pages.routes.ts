import { Routes } from '@angular/router';
import { RoleGuard } from '../auth/guards/role.guard';

// Hər səhifə `loadComponent` ilə ayrıca yüklənir.
// Əvvəl bu fayl 25 komponenti statik import edirdi, ona görə build hamısını —
// leaflet (xəritə), fullcalendar (təqvim) və bütün hesabatlarla birlikdə — bir
// chunk-a yığırdı: istifadəçi sadəcə Əsas Səhifəni açanda da ~1.2 MB alırdı.
// Shell komponentini import etmir: sidebar menyunu bu massivdən qurur və dövri import yaranmır.
export const uiPageRoutes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/ui-dashboard.component').then(m => m.UiDashboardComponent),
        data: {
            menu: {
                area: 'app', section: 'Əsas', order: 0,
                title: 'Əsas Səhifə', icon: 'home', pageKey: 'dashboard'
            }
        }
    },

    // ── Hesabatlar ──────────────────────────────────────────────────
    {
        path: 'reports',
        loadComponent: () => import('./reports/reports-location/reports-location.component').then(m => m.ReportsComponent),
    },
    {
        path: 'reports/inspection-statistics',
        loadComponent: () => import('./reports/inspection-statistics/inspection-statistics.component').then(m => m.YoxlamaStatistikasiComponent),
        data: {
            menu: {
                area: 'app', section: 'Hesabat və təhlil', order: 70,
                group: 'Hesabatlar', groupIcon: 'bar_chart_4_bars', groupOrder: 70,
                title: 'Yoxlama statistikası', pageKey: 'report-inspection-statistics'
            }
        }
    },
    {
        path: 'reports/main-category-compliance',
        loadComponent: () => import('./reports/main-category-compliance/main-category-compliance.component').then(m => m.EsasTasnifatUygunluguComponent),
        data: {
            menu: {
                area: 'app', section: 'Hesabat və təhlil', order: 71,
                group: 'Hesabatlar', groupIcon: 'bar_chart_4_bars', groupOrder: 70,
                title: 'Əsas təsnifat uyğunluğu', pageKey: 'report-main-category-compliance'
            }
        }
    },
    {
        path: 'reports/branch-scoring',
        loadComponent: () => import('./reports/branch-scoring/branch-scoring.component').then(m => m.SobelerPuanlamasiComponent),
        data: {
            menu: {
                area: 'app', section: 'Hesabat və təhlil', order: 72,
                group: 'Hesabatlar', groupIcon: 'bar_chart_4_bars', groupOrder: 70,
                title: 'Şöbələr puanlaması', pageKey: 'report-branch-scoring'
            }
        }
    },
    {
        path: 'reports/nonconformity-analysis',
        loadComponent: () => import('./reports/nonconformity-analysis/nonconformity-analysis.component').then(m => m.UygunsuzluqAnaliziComponent),
    },
    {
        path: 'reports/checklist-analysis',
        loadComponent: () => import('./reports/checklist-analysis/checklist-analysis.component').then(m => m.ChecklistAnalysisComponent),
    },
    {
        path: 'reports/nonconformity-category-report',
        loadComponent: () => import('./reports/nonconformity-category-report/nonconformity-category-report.component').then(m => m.UygunsuzluqTasnifatHesabatiComponent),
    },
    {
        path: 'reports/inspection-plan-work',
        loadComponent: () => import('./reports/inspection-plan-work/inspection-plan-work.component').then(m => m.InspectionPlanWorkComponent),
        canActivate: [RoleGuard],
        data: { roles: ['Admin', 'HeadInspector'] },
    },

    // ── Planlama ────────────────────────────────────────────────────
    {
        path: 'plans',
        loadComponent: () => import('./plans/plans.component').then(m => m.PlansComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./plans/plan-user-list/plan-user-list.component').then(m => m.PlanUserListComponent),
            },
            {
                path: 'checked',
                loadComponent: () => import('./plans/plan-checked/plan-checked.component').then(m => m.PlanCheckedComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 12,
                        group: 'Planlama', groupIcon: 'edit_calendar', groupOrder: 10,
                        title: 'Yoxlanılmış', pageKey: 'plan-checked'
                    }
                }
            },
            {
                path: 'approve',
                loadComponent: () => import('./plans/plans-approve/plans-approve.component').then(m => m.PlansApproveComponent),
            },
            {
                path: 'actions',
                loadComponent: () => import('./plans/plan-actions/plan-actions.component').then(m => m.PlanActionsComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 11,
                        group: 'Planlama', groupIcon: 'edit_calendar', groupOrder: 10,
                        title: 'Əməliyyatlar', pageKey: 'plan-actions'
                    }
                }
            },
            {
                path: 'add',
                loadComponent: () => import('./plans/plan-user-list/plan-user-list.component').then(m => m.PlanUserListComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 10,
                        group: 'Planlama', groupIcon: 'edit_calendar', groupOrder: 10,
                        title: 'Planla', pageKey: 'plans'
                    }
                }
            },
            {
                path: 'create',
                loadComponent: () => import('./plans/plan-user-list/plan-create/plan-create.component').then(m => m.PlanCreateComponent),
            },
            {
                path: 'calendar',
                loadComponent: () => import('./plans/plan-calendar/plan-calendar.component').then(m => m.PlanCalendarComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 30,
                        title: 'Təqvim', icon: 'date_range', pageKey: 'plan-calendar'
                    }
                }
            },
            {
                path: 'route',
                loadComponent: () => import('./plans/plan-route/plan-route.component').then(m => m.PlanRouteComponent),
                canActivate: [RoleGuard],
                data: {
                    roles: ['Admin', 'HeadInspector'],
                    menu: {
                        area: 'app', section: 'İş axını', order: 13,
                        group: 'Planlama', groupIcon: 'edit_calendar', groupOrder: 10,
                        title: 'Marşrut', pageKey: 'plan-route'
                    }
                },
            },
        ],
    },

    // ── Yoxlamalar ──────────────────────────────────────────────────
    {
        path: 'inspections',
        loadComponent: () => import('./inspections/inspections.component').then(m => m.InspectionsComponent),
        data: {
            menu: {
                area: 'app', section: 'İş axını', order: 20,
                group: 'Yoxlama', groupIcon: 'fact_check', groupOrder: 20,
                title: 'Yoxlamalar', pageKey: 'inspections'
            }
        },
        children: [
            {
                path: '',
                loadComponent: () => import('./inspections/inspections-list/inspections-list.component').then(m => m.InspectionsListComponent),
            },
            {
                path: 'approve',
                loadComponent: () => import('./inspections/inspection-approve/inspection-approve.component').then(m => m.InspectionApproveComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 21,
                        group: 'Yoxlama', groupIcon: 'fact_check', groupOrder: 20,
                        title: 'Təsdiq', pageKey: 'inspection-approve'
                    }
                }
            },
            {
                path: 'details',
                loadComponent: () => import('./inspections/inspection-details/inspection-details.component').then(m => m.InspectionDetailsComponent),
            },
        ],
    },

    // ── Uyğunsuzluqlar ──────────────────────────────────────────────
    {
        path: 'disruptions',
        loadComponent: () => import('./disruptions/disruptions.component').then(m => m.DisruptionsComponent),
        data: {
            menu: {
                area: 'app', section: 'İş axını', order: 40,
                group: 'Uyğunsuzluqlar', groupIcon: 'report', groupOrder: 40,
                title: 'Uyğunsuzluqlar', pageKey: 'disruptions'
            }
        },
        children: [
            {
                path: '',
                loadComponent: () => import('./disruptions/disruption-list/disruption-list.component').then(m => m.DisruptionListComponent),
            },
            {
                path: 'middle',
                loadComponent: () => import('./disruptions/disruption-middle/disruption-middle.component').then(m => m.DisruptionMiddleComponent),
                canActivate: [RoleGuard],
                data: {
                    roles: ['Inspector', 'HeadInspector', 'Admin'],
                    menu: {
                        area: 'app', section: 'İş axını', order: 41,
                        group: 'Uyğunsuzluqlar', groupIcon: 'report', groupOrder: 40,
                        title: 'Müfəttiş təsdiqi', pageKey: 'disruption-middle'
                    }
                },
            },
            {
                // Görünürlük backend-dədir: Admin/HeadInspector hamısını, qalanlar özününkünü görür
                path: 'tracking',
                loadComponent: () => import('./disruptions/disruption-tracking/disruption-tracking.component').then(m => m.DisruptionTrackingComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 42,
                        group: 'Uyğunsuzluqlar', groupIcon: 'report', groupOrder: 40,
                        title: 'Uyğunsuzluq izləmə', pageKey: 'disruption-tracking'
                    }
                },
            },
            {
                path: 'details',
                loadComponent: () => import('./disruptions/disruption-details/disruption-details.component').then(m => m.DisruptionDetailsComponent),
            },
            {
                path: 'middle-details',
                loadComponent: () => import('./disruptions/disruption-middle/disruption-middle-details/disruption-middle-details.component').then(m => m.DisruptionMiddleDetailsComponent),
                canActivate: [RoleGuard],
                data: { roles: ['Inspector', 'HeadInspector', 'Admin'] },
            },
        ],
    },

    // ── Cavablar ────────────────────────────────────────────────────
    {
        path: 'answers',
        data: {
            menu: {
                area: 'app', section: 'İş axını', order: 50,
                group: 'Cavablar', groupIcon: 'border_color', groupOrder: 50,
                title: 'Cavabla', pageKey: 'answers'
            }
        },
        children: [
            {
                path: '',
                loadComponent: () => import('./answers/answers.component').then(m => m.AnswersComponent),
            },
            {
                path: 'details',
                loadComponent: () => import('./answers/answer-details/answer-details.component').then(m => m.AnswerDetailsComponent),
            },
            {
                path: 'approve',
                loadComponent: () => import('./answers/answer-approve/answer-approve.component').then(m => m.AnswerApproveComponent),
                data: {
                    menu: {
                        area: 'app', section: 'İş axını', order: 51,
                        group: 'Cavablar', groupIcon: 'border_color', groupOrder: 50,
                        title: 'Təsdiq gözləyən', pageKey: 'answer-approve'
                    }
                }
            },
            {
                path: 'approve-details',
                loadComponent: () => import('./answers/answer-approve/answer-approve-details/answer-approve-details.component').then(m => m.AnswerApproveDetailsComponent),
            },
        ],
    },

    // ── Ərazi profili ───────────────────────────────────────────────
    // `LocationProfileComponent`-də router-outlet yoxdur, ona görə
    // əvvəlki uşaq marşrutları heç vaxt render olunmurdu — hər iki
    // ünvan sadəcə komponentin özünü göstərir.
    {
        path: 'profiles',
        loadComponent: () => import('./profiles/location-profile/location-profile.component').then(m => m.LocationProfileComponent),
    },
    {
        path: 'profiles/location',
        loadComponent: () => import('./profiles/location-profile/location-profile.component').then(m => m.LocationProfileComponent),
        data: {
            menu: {
                area: 'app', section: 'Hesabat və təhlil', order: 60,
                title: 'Ərazi profili', icon: 'account_box', pageKey: 'location-profile'
            }
        }
    },
];

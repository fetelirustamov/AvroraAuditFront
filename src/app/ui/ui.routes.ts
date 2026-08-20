import { Routes } from '@angular/router';
import { UiComponent } from './ui.component';
import { PlanCalendarComponent } from './plans/plan-calendar/plan-calendar.component';
import { PlansComponent } from './plans/plans.component';
import { PlanUserListComponent } from './plans/plan-user-list/plan-user-list.component';
import { PlanCheckedComponent } from './plans/plan-checked/plan-checked.component';
import { PlansApproveComponent } from './plans/plans-approve/plans-approve.component';
import { PlanActionsComponent } from './plans/plan-actions/plan-actions.component';
import { PlanCreateComponent } from './plans/plan-user-list/plan-create/plan-create.component';
import { PlanRouteComponent } from './plans/plan-route/plan-route.component';
import { InspectionsComponent } from './inspections/inspections.component';
import { InspectionsListComponent } from './inspections/inspections-list/inspections-list.component';
import { DisruptionsComponent } from './disruptions/disruptions.component';
import { DisruptionMiddleComponent } from './disruptions/disruption-middle/disruption-middle.component';
import { DisruptionMiddleDetailsComponent } from './disruptions/disruption-middle/disruption-middle-details/disruption-middle-details.component';
import { InspectionApproveComponent } from './inspections/inspection-approve/inspection-approve.component';
import { LocationProfileComponent } from './profiles/location-profile/location-profile.component';
import { DisruptionListComponent } from './disruptions/disruption-list/disruption-list.component';
import { SignInComponent } from '../authentication/sign-in/sign-in.component';
import { RoleGuard } from '../auth/guards/role.guard';
import { AnswersComponent } from './answers/answers.component';
import { AnswerDetailsComponent } from './answers/answer-details/answer-details.component';
import { AnswerApproveComponent } from './answers/answer-approve/answer-approve.component';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AnswerApproveDetailsComponent } from './answers/answer-approve/answer-approve-details/answer-approve-details.component';
import { DisruptionDetailsComponent } from './disruptions/disruption-details/disruption-details.component';
import { InspectionDetailsComponent } from './inspections/inspection-details/inspection-details.component';
import { UiDashboardComponent } from './dashboard/ui-dashboard.component';
import { ReportsComponent } from './reports/reports-location/reports-location.component';
import { YoxlamaStatistikasiComponent } from './reports/inspection-statistics/inspection-statistics.component';
import { EsasTasnifatUygunluguComponent } from './reports/main-category-compliance/main-category-compliance.component';
import { SobelerPuanlamasiComponent } from './reports/branch-scoring/branch-scoring.component';
import { UygunsuzluqAnaliziComponent } from './reports/nonconformity-analysis/nonconformity-analysis.component';
import { ChecklistAnalysisComponent } from './reports/checklist-analysis/checklist-analysis.component';
import { UygunsuzluqTasnifatHesabatiComponent } from './reports/nonconformity-category-report/nonconformity-category-report.component';
import { InspectionPlanWorkComponent } from './reports/inspection-plan-work/inspection-plan-work.component';

export const uiRoutes: Routes = [
    {
        path: '',
        component: UiComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: UiDashboardComponent },
            { path: 'reports', component: ReportsComponent },
            { path: 'reports/inspection-statistics', component: YoxlamaStatistikasiComponent },
            { path: 'reports/main-category-compliance', component: EsasTasnifatUygunluguComponent },
            { path: 'reports/branch-scoring', component: SobelerPuanlamasiComponent },
            { path: 'reports/nonconformity-analysis', component: UygunsuzluqAnaliziComponent },
            { path: 'reports/checklist-analysis', component: ChecklistAnalysisComponent },
            { path: 'reports/nonconformity-category-report', component: UygunsuzluqTasnifatHesabatiComponent },
            {
                path: 'reports/inspection-plan-work',
                component: InspectionPlanWorkComponent,
                canActivate: [RoleGuard],
                data: { roles: ['Admin', 'HeadInspector'] },
            },
            {
                path: 'plans',
                component: PlansComponent,
                children: [
                    { path: '', component: PlanUserListComponent },
                    { path: 'checked', component: PlanCheckedComponent },
                    { path: 'approve', component: PlansApproveComponent },
                    { path: 'actions', component: PlanActionsComponent },
                    { path: 'add', component: PlanUserListComponent },
                    { path: 'create', component: PlanCreateComponent },
                    { path: 'calendar', component: PlanCalendarComponent },
                    {
                        path: 'route',
                        component: PlanRouteComponent,
                        canActivate: [RoleGuard],
                        data: { roles: ['Admin', 'HeadInspector'] },
                    },

                ],
            },
            {
                path: 'inspections',


                component: InspectionsComponent,
                children: [
                    { path: '', component: InspectionsListComponent },
                    { path: 'approve', component: InspectionApproveComponent },
                    { path: 'details', component: InspectionDetailsComponent },

                ],
            },
            {
                path: 'disruptions',
                component: DisruptionsComponent,
                children: [
                    { path: '', component: DisruptionListComponent },
                    {
                        path: 'middle',
                        component: DisruptionMiddleComponent,
                        canActivate: [RoleGuard],
                        data: { roles: ['Inspector', 'HeadInspector', 'Admin'] }
                    },
                    // {path:'disruptions', component: DisruptionsComponent},
                    { path: 'details', component: DisruptionDetailsComponent },
                    {
                        path: 'middle-details', component: DisruptionMiddleDetailsComponent,
                        canActivate: [RoleGuard], data: { roles: ['Inspector', 'HeadInspector', 'Admin'] }
                    },

                ],
            },
            {
                path: 'answers',
                // component: AnswersComponent,
                children: [
                    { path: '', component: AnswersComponent },
                    { path: 'details', component: AnswerDetailsComponent },
                    { path: 'approve', component: AnswerApproveComponent },
                    { path: 'approve-details', component: AnswerApproveDetailsComponent }
                ],
            },
            {
                path: 'profiles',
                component: LocationProfileComponent,
                children: [
                    { path: '', component: LocationProfileComponent },
                    { path: 'location', component: LocationProfileComponent },
                ]
            }
        ]
    },

];

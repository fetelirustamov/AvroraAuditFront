// `POST /api/Dashboard/overview` cavabının tipləri — backend-dəki
// `DashboardOverviewDto` ilə birbaşa uyğundur.

export interface DashboardFilter {
    year: number;
    month: number | null;
    firmId: number | null;
    regionId: number | null;
    locationCode: number | null;
}

export interface DashboardPeriod {
    year: number;
    month: number | null;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
}

export interface DashboardKpi {
    totalInspections: number;
    plannedInspections: number;
    unplannedInspections: number;
    completedInspections: number;
    completionRate: number;
    averageCompliance: number;
    totalFindings: number;
    openFindings: number;

    // Əvvəlki dövrdə müqayisə bazası yoxdursa `null`.
    // Saylarda nisbi dəyişmə (%), faiz göstəricilərində faiz bəndi fərqi.
    totalInspectionsDelta: number | null;
    openFindingsDelta: number | null;
    completionRateDelta: number | null;
    averageComplianceDelta: number | null;
}

export interface DashboardMonthPoint {
    month: number;
    inspections: number;
    completed: number;
    findings: number;
    compliance: number;
}

export interface DashboardStatusStep {
    status: number;
    count: number;
}

export interface DashboardSectionScore {
    sectionName: string;
    compliance: number;
    previousCompliance: number;
    findings: number;
}

export interface DashboardHeatCell {
    sectionName: string;
    month: number;
    findings: number;
}

export interface DashboardCategoryShare {
    categoryName: string;
    findings: number;
}

export interface DashboardLocation {
    locationCode: number;
    locationName: string;
    regionName: string;
    inspections: number;
    findings: number;
    openFindings: number;
    compliance: number;
}

export interface DashboardOverview {
    period: DashboardPeriod;
    kpi: DashboardKpi;
    monthlyTrend: DashboardMonthPoint[];
    statusFunnel: DashboardStatusStep[];
    sectionCompliance: DashboardSectionScore[];
    sectionMonthHeat: DashboardHeatCell[];
    categoryShare: DashboardCategoryShare[];
    locations: DashboardLocation[];
}

export const MONTH_SHORT_LABELS = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
    'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'
];

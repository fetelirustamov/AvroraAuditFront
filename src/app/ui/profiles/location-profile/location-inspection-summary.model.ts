export interface LocationInspectionPlanSummary {
  planId: number;
  planResult: number;
  startDate: string;
  totalCount: number;
  solvedCount: number;
  openCount: number;
}

export interface LocationProfileView {
  locationName: string;
  locationCode: number;
  summaries: LocationInspectionPlanSummary[];
  avgPlanResult: number;
  totalDiscrepancies: number;
  solved: number;
  open: number;
  lastInspectionDate: string | null;
}

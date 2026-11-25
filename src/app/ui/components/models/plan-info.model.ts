export interface PlanInfo {
    inspectionPlanId: number;
    inspectorName: string;
    inspectorCode: string;
    locationCode: string;
    locationName: string;
    status: number;
    /** Planlaşdırılmış başlama/bitmə vaxtı */
    startDate: string | null;
    endDate: string | null;
    /** Faktiki iş vaxtı (mobil yazır); yoxlama aparılmayıbsa null */
    workStartDate: string | null;
    workEndDate: string | null;
}

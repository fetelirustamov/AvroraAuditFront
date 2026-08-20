export interface InspectionPlanWorkItem {
    locationCode: number;
    userName: string;
    workStartDate: string | null;
    workEndDate: string | null;
    status: number;
}

export interface InspectionPlanWorkRow {
    row: number;
    magaza_kodu: number | string;
    istifadeci: string;
    is_baslama: string | null;
    is_bitme: string | null;
    status: number;
    statusLabel: string;
    statusClass: 'processed' | 'not-processed' | 'unknown';
}

export interface InspectionPlanWorkResponseData {
    items: Record<string, unknown>[];
    total: number;
    status2Count: number;
    status34Count: number;
}

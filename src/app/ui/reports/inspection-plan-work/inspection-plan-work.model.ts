export interface InspectionPlanWorkItem {
    locationCode: number;
    userName: string;
    workStartDate: string | null;
    workEndDate: string | null;
    status: number;
}

import { StatusTone } from '../../../shared/status/status-meta';

export interface InspectionPlanWorkRow {
    row: number;
    magaza_kodu: number | string;
    istifadeci: string;
    is_baslama: string | null;
    is_bitme: string | null;
    status: number;
    statusLabel: string;
    statusTone: StatusTone;
}

export interface InspectionPlanWorkResponseData {
    items: Record<string, unknown>[];
    total: number;
    notWorkedCount: number;
    workedCount: number;
}

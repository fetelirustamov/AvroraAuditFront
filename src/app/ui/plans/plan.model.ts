
export class PlanApprove {
    planId!: number;
    status!: number;
    /** Rədd və geri qaytarmanın səbəbi (server `StatusChangeLogs`-a yazır). */
    reason?: string;
}


export class PlanDetails {
    id!: number;
    firmId!: number;
    inspectorsName!: string;
    locationCode!: number;
    locationName!: string;
    createdBy!: string;
    startDate!: string;
    endDate!: string;
    createdDate!: Date;
    status!: number;

    constructor(
        id: number,
        firmId: number,
        inspectorsName: string,
        locationCode: number,
        locationName: string,
        createdBy: string,
        startDate: string,
        endDate: string,
        createdDate: Date,
        status: number,
    ) {
        this.id = id;
        this.firmId = firmId;
        this.inspectorsName = inspectorsName;
        this.locationName = locationName;
        this.locationCode = locationCode;
        this.createdBy = createdBy;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdDate = createdDate;
        this.status = status;

    }
}

export class CalendarDate {
    StartDate!: Date;
    LocationCode!: string;
    LocationName!: string;
    auditorName!: string;
    endDate!: Date;
}




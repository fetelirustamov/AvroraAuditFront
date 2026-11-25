export class InspectionPlan {
    id: number;
    locationCode: string;
    locationName: string;
    startDate: string;
    endDate: string;
    status: number;
    inspectors: number[];
    inspectorsName: string = "";
    firmId: number;
    /** Siyahıda gəlir (`inspectionPlans/getDetails`), yaratmada göndərilmir */
    firmName?: string;
    createdBy: number;
    createdDate: string | Date;
    disruptionStatus: number = 0;
    constructor(
        id: number,
        locationCode: string,
        startDate: string,
        endDate: string,
        status: number,
        inspectors: number[],
        inspectorName: string,
        locationName: string,
        firmId: number,
        createdBy: number,
        createdDate: string
    ) {
        this.id = id;
        this.locationCode = locationCode;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.inspectors = inspectors;
        this.inspectorsName = inspectorName;
        this.locationName = locationName;
        this.firmId = firmId;
        this.createdBy = createdBy;
        this.createdDate = createdDate;
    }
}
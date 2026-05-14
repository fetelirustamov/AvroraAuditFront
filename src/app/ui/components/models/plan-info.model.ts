export class PlanInfo {
    inspectionPlanId: number;
    inspectorName: string;
    inspectorCode: string;
    workStartDate: Date;
    workEndDate: Date;
    locationCode: string;
    locationName: string;
    constructor(inspectorName: string, inspectorCode: string, workStartDate: Date, workEndDate: Date, locationCode: string, locationName: string, inspectionPlanId: number) {
        this.inspectorName = inspectorName;
        this.inspectorCode = inspectorCode;
        this.workStartDate = workStartDate;
        this.workEndDate = workEndDate;
        this.locationCode = locationCode;
        this.locationName = locationName;
        this.inspectionPlanId = inspectionPlanId;
    }
}
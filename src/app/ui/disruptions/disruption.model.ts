export class DisruptionApproveDto {
    inspectionPlanId: number = 0;
    status!: number;
    disruptionId: number[] = [];
}

export class DisruptionDto {
    id!: number;
    disruptionId!: number;
    inspectorId!: number;
    locationCode!: number;
    inspectionPlanId!: number;
    sectionId!: number;
    disruptionReasonId!: number;
    locationName!: string;
    sectionName!: string;
    reasonName!: string;
    disruptionCategoryId!: number;
    disruptionCategoryName!: string;
    inspectorName!: string;
    description!: string;
    deadline!: number;
    createdDate!: Date;
    status!: number;
}

export class Disruption {
    id: number = 0;
    inspectorId: number = 0;
    inspectionPlanId: number = 0;
    sectionId: number = 0;
    severityId: number = 0;
    disruptionReasonId: number = 0;
    createdDate: Date = new Date();
    description: string = '';
    deadline: number | null = null;
    questionResultDetailsId: number = 0;
    localId: string = '';
}
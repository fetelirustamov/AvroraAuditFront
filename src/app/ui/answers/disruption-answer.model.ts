export class DisruptionAnswerApproveDto {
    Id!: number;
    Note: string = '';
    returnReason: string = '';
    Level!: number;
    answerStatus!: number;
    confirmStatus!: number;
}

export class DisruptionAnswer {
    id!: number;
    disruptionId!: number;
    locationCode!: number;
    userCategoryId?: number;
    level!: number;
    assignedUserCode?: number;
    approveStatus?: number;
    createdDate?: Date;
    approvedDate?: Date;
    resolvedDate?: Date;
    note!: string;
    status!: number;
    img!: string;
}

/** Backend `internalStatus` dəyərləri ilə uyğun olmalıdır (əsasən 0=Yeni, 1=Rədd; bəzi API 2=Rədd). */
export enum DisruptionInternalAnswerStatus {
    New = 0,
    Rejected = 1,
}

export class DisruptionAnswerDTO extends DisruptionAnswer {
    inspectionPlanId!: number;
    userName!: string;
    lastName!: string;
    firstName!: string;
    sectionName!: string;
    disruptionCategoryName!: string;
    inspector!: string;
    description!: string;
    locationName!: string;
    drDate!: Date;
    reasonName!: string;
    isReturned!: boolean;
    returnReason!: string;
    internalStatus!: number;
    /** Uyğunsuzluğun (müfəttişin) fayl sayları — getDetails doldurur */
    image?: number;
    video?: number;
    document?: number;
}

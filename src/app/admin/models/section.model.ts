export interface SectionDto {
    id: number;
    firmId: number;
    firmName?: string;
    sectionName: string;
    sectionDescription?: string;
    categoryIds: number[];
    categoryNames?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface SectionCreateDto {
    firmId: number;
    sectionName: string;
    sectionDescription?: string;
    categoryIds: number[];
}

export interface SectionUpdateDto {
    firmId?: number;
    sectionName?: string;
    sectionDescription?: string;
    categoryIds?: number[];
}




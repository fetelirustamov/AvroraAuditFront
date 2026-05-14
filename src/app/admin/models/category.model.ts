
export interface CategoryDto {
    id: number;
    sectionId?: number;
    sectionName?: string;
    categoryName: string;
    categoryDescription?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryCreateDto {
    sectionId?: number;
    categoryName: string;
    categoryDescription?: string;
}

export interface CategoryUpdateDto {
    sectionId?: number;
    categoryName?: string;
    categoryDescription?: string;
}


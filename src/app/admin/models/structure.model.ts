export interface StructureDto {
    id?: number;
    status?: number;
    locationCode?: number;
    userCode?: number;
    level?: number;
}

export interface StructureUserDto {
    userCode: number;
    userName: string;
    level: number;
}

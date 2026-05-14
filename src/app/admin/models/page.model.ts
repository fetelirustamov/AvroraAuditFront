
export interface PageDto {
    id: number;
    status: number;
    key: string;
    name: string;
}

export interface PageCreateDto {
    status: number;
    key: string;
    name: string;
}

export interface PageUpdateDto {
    id: number;
    status: number;
    key: string;
    name: string;
}

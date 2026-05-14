// GET /api/Roles/{id}/details → data.pages massivi
export interface RolePageDetail {
    pageId: number;
    show: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
}

// GET /api/Roles/{id}/details → data obyekti
export interface RoleDetailDto {
    roleId: number;
    roleName: string;
    roleDescription?: string;
    pages: RolePageDetail[];
}

// GET /api/Roles → list üçün
export interface RoleDto {
    id: number;
    name: string;
    description?: string;
    status?: number;
}

// POST /api/Roles → yaratma üçün
export interface RolePage {
    pageId: number;
    show: number;   // 1 = bəli, 0 = xeyr
    add: number;
    edit: number;
    delete: number;
}

export interface RoleCreateDto {
    name: string;
    description?: string;
    status?: number;
    rolePages: RolePage[];
}

export interface RoleUpdateDto {
    name?: string;
    description?: string;
    status?: number;
    rolePages?: RolePage[];
}

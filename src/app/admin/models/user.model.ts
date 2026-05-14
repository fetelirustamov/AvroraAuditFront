
export interface UserDetail {
    id: number;
    userCode?: number;
    name?: string;
    surName?: string;
    fatherName?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    profileImage?: string;
    isActive?: boolean;
    status?: number;       // 1 = aktiv, 0 = passiv
    roleId?: number;
    roleName?: string;
    firms?: { firmId: number; firmName: string }[];
}

export interface UserDto {
    id: number;
    // API-dən gələn real field-lər
    name?: string;
    surName?: string;
    fatherName?: string;
    userCode?: number;
    status?: number;       // 1 = aktiv, 0 = passiv
    // Alternativ field adları
    firstName?: string;
    lastName?: string;
    email?: string;
    roleName?: string;
    roleId?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    authSettingId?: string;
    address?: string;
    phone?: string;
}

export interface UserCreateDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleId?: number;
}

export interface UserUpdateDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    roleId?: number;
    isActive?: boolean;
}

/** PUT /api/Users/user-code/{userCode}/assignments — status 1 aktiv, 0 passiv */
export interface UserAssignmentsPutDto {
    status: number;
    firmIds: number[];
    roleId: number;
}

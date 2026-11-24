
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
    /**
     * AuthSettings.Name — "LocalDB" olanda parol bu sistemdə saxlanılır.
     * LDAP/OAuth/ExternalDB üçün parol kənar sistemdədir və buradan dəyişdirilmir.
     */
    authType?: string;
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
    position?: string;     // vəzifə, məs. "Mağaza müdürü" — natamam doldurulur
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

/** POST /api/Users — Users cədvəlinə yeni sətir */
export interface UserCreateDto {
    userCode: number;
    name: string;
    surName: string;
    fatherName?: string;
    position?: string;
    email: string;
    password: string;
    /** AuthSettings.id — string olaraq saxlanılır (Users.AuthSettingId sütunu ilə uyğun) */
    authSettingId: string;
}

/**
 * PUT /api/Users/user-code/{userCode}/profile — yalnız kimlik məlumatları.
 * Parol bura daxil deyil, onun üçün ayrıca endpoint var.
 */
export interface UserProfilePutDto {
    name: string;
    surName: string;
    fatherName?: string;
    position?: string;
    email: string;
}

/** PUT /api/Users/user-code/{userCode}/password — admin tərəfindən parol sıfırlama */
export interface UserPasswordPutDto {
    newPassword: string;
}

/** PUT /api/Users/user-code/{userCode}/assignments — status 1 aktiv, 0 passiv */
export interface UserAssignmentsPutDto {
    status: number;
    firmIds: number[];
    roleId: number;
}

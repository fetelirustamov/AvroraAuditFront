/** GET /api/AuthSettings — istifadəçinin autentifikasiya mənbəyi (LocalDB, LDAP, ...) */
export interface AuthSettingDto {
    id: number;
    name: string;
}

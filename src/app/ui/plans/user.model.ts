export class User {
    userCode: number;
    name: string;
    surName: string;
    fatherName: string;
    email: string;
    phone: string;
    roleId: number;
    /** Müfəttiş üzrə plan sayları — backend `inspectors` cavabında qaytarılır (yoxdursa 0). */
    planned?: number;
    confirmed?: number;
    expired?: number;
    finished?: number;

    constructor(
        userCode: number,
        name: string,
        surName: string,
        fatherName: string,
        email: string,
        phone: string,
        roleId: number
    ) {
        this.userCode = userCode;
        this.name = name;
        this.surName = surName;
        this.fatherName = fatherName;
        this.email = email;
        this.phone = phone;
        this.roleId = roleId;
    }
}
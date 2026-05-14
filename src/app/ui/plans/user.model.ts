export class User {
    userCode: number;
    name: string;
    surName: string;
    fatherName: string;
    email: string;
    phone: string;
    roleId: number;

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
export class Location {
    id: number;
    firmId: number;
    locationName: string;
    locationCode: number;
    locationAdress: string;
    contactNumber: string;
    locationType: number;
    responsiblePersonId: number;
    status: number;

    constructor(
        id: number,
        firmId: number,
        locationName: string,
        locationCode: number,
        locationAdress: string,
        contactNumber: string,
        locationType: number,
        responsiblePersonId: number,
        status: number
    ) {
        this.id = id;
        this.firmId = firmId;
        this.locationName = locationName;
        this.locationCode = locationCode;
        this.locationAdress = locationAdress;
        this.contactNumber = contactNumber;
        this.locationType = locationType;
        this.responsiblePersonId = responsiblePersonId;
        this.status = status;
    }
}
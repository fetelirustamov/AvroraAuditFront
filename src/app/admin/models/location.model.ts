export interface LocationDto {
    id?: number;
    firmId: number;
    locationCode: number;
    locationName: string;
    locationAddress?: string;
    locationType?: number;
    contactNumber?: string;
    responsiblePersonId?: number;
    /** API `Location.RegionID`-i camelCase ilə göndərir. Bölgənin adı burada yoxdur: `locations/regions/{firmId}`-dən alınır */
    regionID?: number;
    latitude?: string;
    longitude?: string;
    radius?: number;
    status?: number;
}
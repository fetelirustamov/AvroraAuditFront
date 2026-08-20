export interface RouteStopDto {
    order: number;
    planId: number;
    locationCode: number;
    locationName: string;
    latitude: number;
    longitude: number;
    distanceFromPreviousKm: number;
    durationFromPreviousMinutes: number;
    status: number;
    isVisited: boolean;
    workDurationMinutes: number | null;
    checklistResult: string | null;
}

export interface RoutePlanDto {
    stops: RouteStopDto[];
    totalDistanceKm: number;
    totalDurationMinutes: number;
    routeGeometry: number[][];
    skippedLocations: string[];
}

export interface DailyDistanceReportRow {
    inspectorId: number;
    inspectorName: string;
    date: string;
    locationCode: number;
    locationName: string;
    isVisited: boolean;
    distanceFromPreviousKm: number;
    workDurationMinutes: number | null;
    checklistResult: string | null;
}

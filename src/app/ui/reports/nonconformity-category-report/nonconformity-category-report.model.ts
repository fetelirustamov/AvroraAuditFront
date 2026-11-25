/** API sətri: məkan × şöbə × uyğunsuzluq təsnifatı */
export interface NonconformityCategoryItem {
    regionName: string | null;
    locationCode: number;
    locationName: string | null;
    sectionName: string | null;
    categoryName: string | null;
    /** Məkan + şöbə üzrə ümumi uyğunsuzluq sayı */
    sectionCount: number;
    /** Məkan + şöbə + təsnifat üzrə uyğunsuzluq sayı */
    categoryCount: number;
}

export interface NonconformityCategoryReportData {
    items: NonconformityCategoryItem[];
    total: number;
    /** Filtrdən sonrakı bütün sətirlər üzrə cəmlər (KPI kartları) */
    totalSectionCount: number;
    totalCategoryCount: number;
}

/** Cədvəldə göstərilən sətir */
export interface NonconformityCategoryRow {
    row: number;
    bolge: string;
    magaza_kodu: number | string;
    magaza_adi: string;
    sobeler: string;
    uygunsuzluq_tasnifat: string;
    say_sobe: number;
    say_tasnifat: number;
}

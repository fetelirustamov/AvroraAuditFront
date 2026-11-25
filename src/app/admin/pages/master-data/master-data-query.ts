/**
 * "Audit strukturu" tablarının URL açarları. Üç siyahı bir URL-dədir: hər tabın öz axtarışı,
 * filtri və səhifəsi var, tab dəyişəndə digərinin vəziyyəti itmir. Firma dəyişəndə hamısı sıfırlanır.
 */
export const MASTER_DATA_QUERY = {
    sections: { search: 'sectionSearch', page: 'sectionPage' },
    categories: { search: 'categorySearch', section: 'categorySection', page: 'categoryPage' },
    locations: { search: 'locationSearch', region: 'locationRegion', page: 'locationPage' },
} as const;

/** Firma dəyişəndə URL-dən silinən açarlar. */
export const MASTER_DATA_TAB_RESET: Record<string, null> = Object.fromEntries(
    Object.values(MASTER_DATA_QUERY).flatMap(keys => Object.values(keys)).map(key => [key, null])
);

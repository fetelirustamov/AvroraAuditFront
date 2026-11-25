/** Hesabat filtrlərinin ortaq seçimləri. */

/** Cari il və əvvəlki 5 il, yenidən köhnəyə. İlk element standart dəyərdir. */
export const REPORT_YEARS: readonly number[] = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

export const MONTH_OPTIONS: readonly { value: number; label: string }[] = [
    { value: 1, label: 'Yanvar' }, { value: 2, label: 'Fevral' },
    { value: 3, label: 'Mart' }, { value: 4, label: 'Aprel' },
    { value: 5, label: 'May' }, { value: 6, label: 'İyun' },
    { value: 7, label: 'İyul' }, { value: 8, label: 'Avqust' },
    { value: 9, label: 'Sentyabr' }, { value: 10, label: 'Oktyabr' },
    { value: 11, label: 'Noyabr' }, { value: 12, label: 'Dekabr' },
];

/** Cədvəl səhifə ölçüləri. İlk element standart dəyərdir (URL-ə yazılmır). */
export const PAGE_SIZES: readonly number[] = [10, 25, 50];

import { Injectable } from '@angular/core';

/** `ad-2026-09-03.xlsx` şəklində fayl adı — hesabatlarda təkrarlanan konvensiya */
export function datedFileName(base: string, extension: string): string {
    return `${base}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

/**
 * Excel / PDF ixracı.
 *
 * `xlsx` (864 KB) və `pdfmake` + şriftləri (2.8 MB + 812 KB) əvvəl hesabat
 * komponentlərinin başında statik import olunurdu. 7-9 fayl onları paylaşdığı
 * üçün build hamısını ortaq chunk-a yığırdı və istifadəçi **hər hansı** hesabata
 * girdiyi anda ~3.5 MB yüklənirdi — halbuki bu kitabxanalar yalnız "Excel"/"PDF"
 * düyməsi basıldıqda lazımdır. Burada dinamik `import()` ilə yüklənirlər.
 *
 * Həmçinin pdfmake-in `vfs` quraşdırma boilerplate-i (hər faylda təkrarlanırdı)
 * bir yerə toplanıb.
 */
@Injectable({ providedIn: 'root' })
export class FileExportService {

    /** Obyekt sətirlərindən Excel faylı (sütun adları açarlardan götürülür) */
    async exportRowsToExcel(
        rows: Record<string, unknown>[],
        sheetName: string,
        fileName: string,
    ): Promise<void> {
        const XLSX = await import('xlsx');
        const sheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        XLSX.writeFile(workbook, fileName);
    }

    /** Sətir massivlərindən Excel faylı (şablon/başlıqlı ixrac üçün) */
    async exportGridToExcel(
        grid: unknown[][],
        sheetName: string,
        fileName: string,
    ): Promise<void> {
        const XLSX = await import('xlsx');
        const sheet = XLSX.utils.aoa_to_sheet(grid as any[][]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
        XLSX.writeFile(workbook, fileName);
    }

    /** Yüklənmiş Excel faylını sətir massivi kimi oxu */
    async readSheetGrid(buffer: ArrayBuffer, sheetIndex = 0): Promise<any[][]> {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]];
        return XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
    }

    /** pdfmake sənəd təsvirindən PDF faylı */
    async exportPdf(docDefinition: unknown, fileName: string): Promise<void> {
        const [pdfMakeModule, pdfFontsModule] = await Promise.all([
            import('pdfmake/build/pdfmake'),
            import('pdfmake/build/vfs_fonts'),
        ]);
        const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
        const fonts: any = (pdfFontsModule as any).default ?? pdfFontsModule;
        // pdfmake versiyasına görə şriftlər ya `pdfMake.vfs`, ya birbaşa `vfs` altındadır
        pdfMake.vfs = fonts.pdfMake ? fonts.pdfMake.vfs : fonts.vfs;
        pdfMake.createPdf(docDefinition).download(fileName);
    }
}

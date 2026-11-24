import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { LocationStructureComponent } from './location-structure.component';
import { appTestProviders } from '../../../../../testing/test-providers';
import { environment } from '../../../../../environments/environment';
import { FileExportService } from '../../../../shared/services/file-export.service';

/** Sətir massivindən həqiqi .xlsx faylı qurur (idxal parserini real fayl üzərində yoxlamaq üçün). */
async function makeWorkbookFile(grid: unknown[][]): Promise<File> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(grid as any[][]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Yetkilər');
  const bytes: Uint8Array = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([bytes], 'test.xlsx');
}

describe('LocationStructureComponent', () => {
  let component: LocationStructureComponent;
  let fixture: ComponentFixture<LocationStructureComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [LocationStructureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationStructureComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // ngOnInit → loadFirms(): idxal testlərinə dəxli yoxdur, boşaldırıq
    httpMock.match(req => req.url.includes('/firms'))
      .forEach(req => req.flush({ success: true, message: '', data: [] }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Wide format parsing ──────────────────────────────────────────────────────

  describe('parseStructureWorkbook (wide format)', () => {
    const parse = (file: File) => (component as any)['parseStructureWorkbook'](file);

    it('sütun sırasını step sırası kimi oxuyur', async () => {
      const file = await makeWorkbookFile([
        ['Mağaza kodu', 'User 1', 'User 2', 'User 3'],
        [4336, 200456, 200458, ''],
        [4337, 200460, '', '']
      ]);

      const rows = await parse(file);

      expect(rows.length).toBe(2);
      expect(rows[0].locationCode).toBe(4336);
      expect(rows[0].userCodes).toEqual([200456, 200458]);
      expect(rows[0].rowNumber).toBe(2);
      expect(rows[1].locationCode).toBe(4337);
      expect(rows[1].userCodes).toEqual([200460]);
    });

    it('boş xanaları sıxır — 1-ci sütun boşdursa növbəti adam 1-ci step olur', async () => {
      const file = await makeWorkbookFile([
        ['Mağaza kodu', 'User 1', 'User 2', 'User 3'],
        [4336, '', 200458, 200460]
      ]);

      const rows = await parse(file);

      // userCodes[0] serverdə Level 1 olur
      expect(rows[0].userCodes).toEqual([200458, 200460]);
    });

    it('başlıqları diakritikadan asılı olmadan tanıyır', async () => {
      const file = await makeWorkbookFile([
        ['MAGAZA KODU', 'İstifadəçi 1', 'İstifadəçi 2'],
        [4336, 200456, 200458]
      ]);

      const rows = await parse(file);

      expect(rows[0].locationCode).toBe(4336);
      expect(rows[0].userCodes).toEqual([200456, 200458]);
    });

    it('mağaza sütunu yoxdursa xəta atır', async () => {
      const file = await makeWorkbookFile([
        ['Filial', 'User 1'],
        [4336, 200456]
      ]);

      await expectAsync(parse(file)).toBeRejectedWithError(/Mağaza kodu/);
    });

    it('istifadəçi sütunu yoxdursa xəta atır', async () => {
      const file = await makeWorkbookFile([
        ['Mağaza kodu'],
        [4336]
      ]);

      await expectAsync(parse(file)).toBeRejectedWithError(/istifadəçi sütunu/);
    });
  });

  // ── Validasiya və serverə göndərilən yük ─────────────────────────────────────

  describe('importChains', () => {
    const chainsUrl = `${environment.apiUrl}/Structures/chains`;

    beforeEach(() => {
      component.selectedNetwork = { id: 1, name: 'Test' } as any;
      component.allLocations = [
        { id: 1, firmId: 1, locationCode: 4336 },
        { id: 2, firmId: 1, locationCode: 4337 },
        { id: 3, firmId: 2, locationCode: 9999 }
      ] as any;
      component.allUsers = [
        { id: 1, userCode: 200456 },
        { id: 2, userCode: 200458 },
        { id: 3, userCode: 200460 }
      ] as any;
    });

    const run = (rows: unknown[]) => (component as any)['importChains'](rows);

    it('etibarlı sətirləri bir sorğuda zəncir kimi göndərir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456, 200458] },
        { rowNumber: 3, locationCode: 4337, userCodes: [200460] }
      ]);

      const req = httpMock.expectOne(chainsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        chains: [
          { locationCode: 4336, userCodes: [200456, 200458] },
          { locationCode: 4337, userCodes: [200460] }
        ]
      });

      req.flush({ success: true, message: 'ok', data: { successCount: 2, failures: [] } });

      expect(component.uploadResults?.successCount).toBe(2);
      expect(component.uploadResults?.errorCount).toBe(0);
      expect(component.isImporting).toBeFalse();
    });

    it('tanınmayan istifadəçi kodu olan sətri tam rədd edir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456, 999999] }
      ]);

      httpMock.expectNone(chainsUrl);
      expect(component.uploadResults?.successCount).toBe(0);
      expect(component.uploadResults?.errorCount).toBe(1);
      expect(component.uploadResults?.issues[0].message).toContain('999999');
    });

    it('seçilmiş şəbəkəyə aid olmayan mağazanı rədd edir', () => {
      run([
        { rowNumber: 2, locationCode: 9999, userCodes: [200456] }
      ]);

      httpMock.expectNone(chainsUrl);
      expect(component.uploadResults?.errorCount).toBe(1);
    });

    it('boş zəncirli sətri göndərmir (mağazanın sxemini silməmək üçün)', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [] }
      ]);

      httpMock.expectNone(chainsUrl);
      expect(component.uploadResults?.errorCount).toBe(1);
    });

    it('təkrarlanan mağaza sətrini xəbərdarlıq kimi ötürür', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456] },
        { rowNumber: 3, locationCode: 4336, userCodes: [200458] }
      ]);

      const req = httpMock.expectOne(chainsUrl);
      expect(req.request.body.chains.length).toBe(1);
      expect(req.request.body.chains[0].userCodes).toEqual([200456]);

      req.flush({ success: true, message: 'ok', data: { successCount: 1, failures: [] } });

      expect(component.uploadResults?.warningCount).toBe(1);
      expect(component.uploadResults?.errorCount).toBe(0);
    });

    it('zəncirdə təkrarlanan istifadəçini rədd edir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456, 200456] }
      ]);

      httpMock.expectNone(chainsUrl);
      expect(component.uploadResults?.errorCount).toBe(1);
      expect(component.uploadResults?.issues[0].message).toContain('təkrarlanır');
    });

    it('server uğursuzluğunu mağazanın sətir nömrəsinə bağlayır', () => {
      run([
        { rowNumber: 7, locationCode: 4336, userCodes: [200456] }
      ]);

      httpMock.expectOne(chainsUrl).flush({
        success: false,
        message: 'ok',
        data: { successCount: 0, failures: [{ locationCode: 4336, message: 'DB xətası' }] }
      });

      expect(component.uploadResults?.errorCount).toBe(1);
      expect(component.uploadResults?.issues[0].row).toBe(7);
      expect(component.uploadResults?.issues[0].message).toBe('DB xətası');
    });
  });

  // ── İxrac (yüklə → redaktə et → geri yüklə dövrəsi) ──────────────────────────

  describe('exportCurrentStructure', () => {
    let exportSpy: jasmine.Spy;

    beforeEach(() => {
      component.selectedNetwork = { id: 1, name: 'Test' } as any;
      component.allLocations = [
        { id: 1, firmId: 1, locationCode: 4336 },
        { id: 2, firmId: 1, locationCode: 4337 },
        { id: 3, firmId: 2, locationCode: 9999 }
      ] as any;
      exportSpy = spyOn(TestBed.inject(FileExportService), 'exportGridToExcel')
        .and.resolveTo();
    });

    it('level sırasını sütun sırasına çevirir və qısa zəncirləri boş xana ilə doldurur', () => {
      component.exportCurrentStructure();

      // Qəsdən qarışıq level sırası ilə qaytarırıq — ixrac özü sıralamalıdır
      httpMock.expectOne(`${environment.apiUrl}/Structures`).flush({
        success: true,
        message: 'ok',
        data: [
          { id: 3, locationCode: 4336, userCode: 200460, level: 3 },
          { id: 1, locationCode: 4336, userCode: 200456, level: 1 },
          { id: 2, locationCode: 4336, userCode: 200458, level: 2 },
          { id: 4, locationCode: 4337, userCode: 200456, level: 1 },
          // Başqa şəbəkənin mağazası — ixraca düşməməlidir
          { id: 5, locationCode: 9999, userCode: 200458, level: 1 }
        ]
      });

      expect(exportSpy).toHaveBeenCalledTimes(1);
      const grid = exportSpy.calls.mostRecent().args[0];

      expect(grid[0]).toEqual(['Mağaza kodu', 'User 1', 'User 2', 'User 3']);
      expect(grid[1]).toEqual([4336, 200456, 200458, 200460]);
      expect(grid[2]).toEqual([4337, 200456, '', '']);
      expect(grid.length).toBe(3);
    });

    it('şəbəkədə sxem yoxdursa fayl yaratmır', () => {
      component.exportCurrentStructure();

      httpMock.expectOne(`${environment.apiUrl}/Structures`).flush({
        success: true, message: 'ok', data: []
      });

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

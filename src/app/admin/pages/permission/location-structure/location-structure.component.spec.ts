import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { LocationStructureComponent } from './location-structure.component';
import { appTestProviders } from '../../../../../testing/test-providers';
import { environment } from '../../../../../environments/environment';
import { FileExportService } from '../../../../shared/services/file-export.service';

/** Sətir massivindən həqiqi .xlsx faylı qurur (idxal parserini real fayl üzərində yoxlamaq üçün). */
async function makeWorkbookFile(grid: unknown[][]): Promise<File> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(grid as any[][]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Təsdiq zəncirləri');
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

  /**
   * Şəbəkəni komponentin real yükləmə axını ilə seçir: mağazaların firmaya görə süzülməsi və
   * strukturların şəbəkəyə görə ayrılması testdə də həqiqi koddan keçir.
   */
  function loadNetwork(structures: unknown[]) {
    component.onNetworkChange({ id: 1, name: 'Test' } as any);
    flushHierarchy(structures);
  }

  /** loadHierarchy-nin üç sorğusunu cavablandırır (həm ilk yükləmə, həm idxaldan sonrakı yeniləmə). */
  function flushHierarchy(structures: unknown[]) {
    const ok = (data: unknown[]) => ({ success: true, message: '', data });
    httpMock.expectOne(`${environment.apiUrl}/locations`).flush(ok([
      { id: 1, firmId: 1, locationCode: '4336' },
      { id: 2, firmId: 1, locationCode: '4337' },
      { id: 3, firmId: 2, locationCode: '9999' }
    ]));
    httpMock.expectOne(`${environment.apiUrl}/users/firm/1`).flush(ok([
      { id: 1, userCode: 200456 },
      { id: 2, userCode: 200458 },
      { id: 3, userCode: 200460 }
    ]));
    httpMock.expectOne(`${environment.apiUrl}/Structures`).flush(ok(structures));
  }

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

    /** Ön baxış dialoqu: true = istifadəçi təsdiqlədi, false = ləğv etdi. */
    let dialogResult: boolean;
    let openSpy: jasmine.Spy;

    beforeEach(() => {
      loadNetwork([{ id: 1, locationCode: 4336, userCode: 200460, level: 1 }]);
      dialogResult = true;
      openSpy = spyOn((component as any).dialog, 'open')
        .and.callFake(() => ({ afterClosed: () => of(dialogResult) }));
    });

    const run = (rows: unknown[]) => (component as any)['importChains'](rows);

    it('etibarlı sətirləri təsdiqdən sonra bir sorğuda zəncir kimi göndərir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456, 200458] },
        { rowNumber: 3, locationCode: 4337, userCodes: [200460] }
      ]);

      // Ön baxış: mağaza başına hazırkı → yeni zəncir
      expect(openSpy).toHaveBeenCalledTimes(1);
      const preview = openSpy.calls.mostRecent().args[1].data;
      expect(preview.rows.length).toBe(2);
      expect(preview.rows[0].code).toBe(4336);
      expect(preview.rows[0].current.length).toBe(1);
      expect(preview.rows[0].next.length).toBe(2);
      expect(preview.rows[1].current).toEqual([]);

      const req = httpMock.expectOne(chainsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        chains: [
          { locationCode: 4336, userCodes: [200456, 200458] },
          { locationCode: 4337, userCodes: [200460] }
        ]
      });

      req.flush({ success: true, message: 'ok', data: { successCount: 2, failures: [] } });
      // Uğurlu idxaldan sonra ağac serverdən yenidən qurulur
      flushHierarchy([]);

      expect(component.uploadResults?.successCount).toBe(2);
      expect(component.uploadResults?.errorCount).toBe(0);
      expect(component.isImporting).toBeFalse();
    });

    it('ləğv ediləndə heç nə göndərmir', () => {
      dialogResult = false;
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456] }
      ]);

      expect(openSpy).toHaveBeenCalledTimes(1);
      httpMock.expectNone(chainsUrl);
      expect(component.uploadResults).toBeNull();
    });

    it('ötürülən sətirləri ön baxışda göstərir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456] },
        { rowNumber: 3, locationCode: 9999, userCodes: [200456] }
      ]);

      const preview = openSpy.calls.mostRecent().args[1].data;
      expect(preview.rows.length).toBe(1);
      expect(preview.issues.length).toBe(1);
      expect(preview.issues[0].row).toBe(3);

      httpMock.expectOne(chainsUrl).flush({ success: true, message: 'ok', data: { successCount: 1, failures: [] } });
      flushHierarchy([]);
    });

    it('tanınmayan istifadəçi kodu olan sətri tam rədd edir', () => {
      run([
        { rowNumber: 2, locationCode: 4336, userCodes: [200456, 999999] }
      ]);

      expect(openSpy).not.toHaveBeenCalled();
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
      flushHierarchy([]);

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
      exportSpy = spyOn(TestBed.inject(FileExportService), 'exportGridToExcel')
        .and.resolveTo();
    });

    it('level sırasını sütun sırasına çevirir və qısa zəncirləri boş xana ilə doldurur', () => {
      // Qəsdən qarışıq level sırası ilə qaytarırıq — ixrac özü sıralamalıdır
      loadNetwork([
        { id: 3, locationCode: 4336, userCode: 200460, level: 3 },
        { id: 1, locationCode: 4336, userCode: 200456, level: 1 },
        { id: 2, locationCode: 4336, userCode: 200458, level: 2 },
        { id: 4, locationCode: 4337, userCode: 200456, level: 1 },
        // Başqa şəbəkənin mağazası — ixraca düşməməlidir
        { id: 5, locationCode: 9999, userCode: 200458, level: 1 }
      ]);

      component.exportCurrentStructure();

      expect(exportSpy).toHaveBeenCalledTimes(1);
      const grid = exportSpy.calls.mostRecent().args[0];

      expect(grid[0]).toEqual(['Mağaza kodu', 'User 1', 'User 2', 'User 3']);
      expect(grid[1]).toEqual([4336, 200456, 200458, 200460]);
      expect(grid[2]).toEqual([4337, 200456, '', '']);
      expect(grid.length).toBe(3);
    });

    it('şəbəkədə sxem yoxdursa fayl yaratmır', () => {
      loadNetwork([]);

      component.exportCurrentStructure();

      expect(exportSpy).not.toHaveBeenCalled();
    });
  });

  // ── URL vəziyyəti (query-state) ──────────────────────────────────────────────

  describe('URL vəziyyəti', () => {
    it('firma seçimi URL-ə yazılır, axtarış sıfırlanır', async () => {
      component.search = '4336';

      loadNetwork([]);
      await fixture.whenStable();

      const url = TestBed.inject(Router).url;
      expect(url).toContain('firm=1');
      expect(url).not.toContain('q=');
      expect(component.search).toBe('');
    });

    it('URL-dəki firma və axtarış açılışda bərpa olunur', async () => {
      await TestBed.inject(Router).navigateByUrl('/?firm=1&q=4336');

      const restored = TestBed.createComponent(LocationStructureComponent);
      restored.detectChanges();
      httpMock.match(req => req.url.includes('/firms'))
        .forEach(req => req.flush({ success: true, message: '', data: [{ id: 1, name: 'Test' }, { id: 2, name: 'Digər' }] }));
      flushHierarchy([]);

      expect(restored.componentInstance.selectedNetwork?.id).toBe(1);
      expect(restored.componentInstance.search).toBe('4336');
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});

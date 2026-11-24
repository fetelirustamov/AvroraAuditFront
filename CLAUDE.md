# AvroraAudit Front — Claude üçün qeydlər

Angular 19 (standalone komponentlər), Angular Material. Backend qardaş qovluqdadır: `../AvroraAuditApi` (bax onun `CLAUDE.md`-si).

```bash
npm start                              # http://localhost:4200, API: environment.ts
npx ng build --configuration production # dist/avrora-audit, bundle limiti 2.5 MB
```

- **Bölmələr:** `src/app/admin/` admin panelidir (master data, icazələr, istifadəçilər). `src/app/ui/` əsas tətbiqdir (planlar, yoxlamalar, uyğunsuzluqlar, hesabatlar, dashboard).
- **Mühitlər:** `environment.ts` lokal API-ni (`https://localhost:44301`), `environment.prod.ts` isə `https://auditapi.tamstore.az:888`-i göstərir.

## Backend kontraktına bağlılıqlar

- JWT claim adları qısadır: `Id`, `Name`, `Surname`, `Email`, `Role`. `Role` vergüllə birləşdirilmiş sətirdir. `auth.service.ts` məhz bu adları oxuyur.
- API cavabları PascalCase gəlir. Model sahələrini buna uyğun yaz.
- `Location.locationCode` API-dən **string** gəlir (model `number` desə də). `Structure.locationCode` isə int-dir. Müqayisədə həmişə `Number(...)` işlət, yoxsa `"4335" !== 4335` olur.

## Domen dəyərləri

- **`InspectionPlans.Status`:**
  - `1`: planlanmış;
  - `2`: təsdiqlənmiş;
  - `3`: yoxlanılmış (keçid statusu, adətən boş olur);
  - `4`: yekunlaşmış;
  - `5`: vaxtı bitmiş;
  - `-1`: rədd.

  Backend-dəki `Statuses` enum-u köhnəlib, ona güvənmə.
- **`Disruptions.Status`:** `0` müfəttiş, `1` baş müfəttiş, `2` təsdiqlənmiş, `-1` rədd. Onay axınında rol ayrılığı frontdadır (`disruption-middle*`). Rol məntiqini burada dəyiş, backend-də yox.
- **Onay zənciri (`Structures`):** level 1 = mağaza müdiri, 2 = satış müdiri, 3 = direktor. Rol adları zəncirdəki mərtəbədən gəlir, istifadəçinin rolundan yox.
- **Uyğunsuzluq mediası** iki modulda saxlanır: `Disruption (1)` və `ChecklistDisruption (4)`. Hər ikisinin `RefId`-si uyğunsuzluğun ID-sidir. `media.component.ts`-dəki `STORAGE_MODULES` xəritəsinə bax.
- **Ərazi bağlantılarının Excel idxalı** wide formatdadır (`Mağaza | User 1 | User 2 …`). Hər sətir mağazanın bütün zəncirini əvəz edir. Bu qəsdən dağıdıcıdır: merge-ə çevirməzdən əvvəl soruş.

## Menyu və icazələr

- Menyunun vahid mənbəyi route-ların `data.menu` sahəsidir (`area, section, order, title, icon, pageKey, group…`). Bu sahəni `MenuService` `adminRoutes`/`uiRoutes` massivindən oxuyur. Yeni səhifə əlavə edəndə menyunu HTML-də yox, route-da qeyd et.
- İcazələr `PermissionService` vasitəsilə `GET /api/me/permissions`-dan gəlir; Admin bütün yoxlamaları keçir. `pageKey` bazadakı `Pages.[Key]` ilə dəqiq uyğun olmalıdır. Açar dəyişsə, həm SQL seed, həm route dəyişməlidir. Yeni açar üçün front deploy-dan **əvvəl** baza seed-i və rol icazələri lazımdır.
- `permissionGuard` və `*hasPermission` mövcuddur. Köhnə `RoleGuard` / `*hasRole` / `data.roles` hələ bir neçə yerdə qalır. Yeni kodda onları yox, icazə qatını işlət.
- Bu hesabatlar menyuya qəsdən salınmayıb, əlavə etmə:
  - `checklist-analysis`: data saxtadır;
  - `reports-location`: SQL-i real datada yoxlanmayıb;
  - `nonconformity-analysis`: data mənbəyi yoxdur.

## Stil və UI

- Dizayn token-ləri və təkrarlanan komponentlər `src/_design-system.scss`-dədir (`.report-page-header`, `.kpi-*`, `.table-card`, `.status-chip`, `.empty-state`…). Yeni səhifədə bunları sıfırdan yazma. Səhifəyə xas vurğu üçün yalnız `--page-accent-from` / `--page-accent-to` təyin et.
- Filtr və düymələr üçün `styles.scss`-dəki qlobal sistemi işlət, öz siniflərini uydurma:
  - filtr kartı: `.g-filter-card` › `.g-filter-grid` › `.g-filter-field` / `.g-filter-field-wide` › `.g-field-label` + `.g-modern-field`;
  - düymələr: `.g-search-btn`, `.g-secondary-btn`, `.g-export-btn`, `.g-approve-btn` / `.g-reject-btn`.
- Form sahələri həmişə `mat-form-field` + `.g-modern-field` olsun. Adi `<input>` ilə `mat-select`-i qarışdırma, hizalama pozulur. Minlərlə option olan siyahıda `mat-select` işlətmə, axtarışlı məhdud siyahı qur.
- Dark mode və RTL yoxdur, qəsdən silinib. Onlar üçün kod yazma.
- Remixicon CSS sinifləri yüklənmir: bir neçə ox glif kodu ilə işlənir (`font-family: remixicon; content: "\ea4e"`). İkon şriftinə toxunmazdan əvvəl `ri-` siniflərini də, `font-family:` istifadəsini də axtar.
- Yeni asılılıq yalnız pulsuz, açıq lisenziyalı ola bilər (MIT/Apache). Audit fotolarını xarici servislərə göndərmə.

## Performans

- `pdfmake` və `xlsx`-i heç vaxt statik import etmə. `shared/services/file-export.service.ts`-i inject et, o kitabxanaları dinamik yükləyir.
- `ui.routes.ts`-də səhifələr `loadComponent` ilə yüklənir. Statik `component:` əlavə etmə: leaflet və fullcalendar ümumi chunk-a qayıdar.

## Redaktə

- Fayllar UTF-8, BOM-suzdur. Windows PowerShell 5.1 ilə toplu redaktə Azərbaycan hərflərini korlayır. Edit alətini və ya Node işlət.
- `sed -i` faylı rename ilə əvəz edir və Windows-da `ng serve` bunu görmür. Edit alətini işlət.

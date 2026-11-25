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
- API cavabları camelCase gəlir (`success`, `message`, `data`, `items`, `total`). İstisna xəta cavabıdır, o PascalCase-dir: `{ StatusCode, Message, Details }`.
- `Location.locationCode` API-dən **string** gəlir (model `number` desə də). `Structure.locationCode` isə int-dir. Müqayisədə həmişə `Number(...)` işlət, yoxsa `"4335" !== 4335` olur. `mat-option [value]`-da da kodu rəqəmə çevir (`+location.locationCode`), yoxsa URL-dən gələn rəqəmlə seçim boş qalır.
- `GET /locations` bölgənin yalnız id-sini qaytarır (`regionID`), adını yox. Bölgə adı `GET /locations/regions/{firmId}`-dən alınır.
- Sual tipi (`QuestionTypeID`) 5: admin forması onu cavab variantlı tip sayır (bazada adı ComboBox), yoxlama detalı isə ilk versiyadan bəri onu dəyər kimi göstərir. Bazadakı `QuestionTypes` ilə yoxlanmayıb, birini dəyişməzdən əvvəl yoxla.

## Domen dəyərləri

- **`InspectionPlans.Status`:**
  - `1`: planlanmış;
  - `2`: təsdiqlənmiş;
  - `3`: yoxlanılmış (keçid statusu, adətən boş olur);
  - `4`: yekunlaşmış;
  - `5`: vaxtı bitmiş;
  - `-1`: rədd.

  Backend-dəki `Statuses` enum-u köhnəlib, ona güvənmə.
- **`Disruptions.Status`:** `0` müfəttiş, `1` baş müfəttiş, `2` təsdiqlənmiş, `-1` rədd. Onay axınında rol ayrılığı frontdadır: `ui/disruptions/disruption-approval.ts` (kim hansı statusda nə edə bilər, təsdiqin nəticə statusu). "Müfəttiş təsdiqi" ekranı və izləmə paneli onu işlədir. Rol məntiqini burada dəyiş, backend-də yox. Təsdiq yalnız yekunlaşmış (4) planın uyğunsuzluğuna verilir.
- **Onay zənciri (`Structures`):** level 1 = mağaza müdiri, 2 = satış müdiri, 3 = direktor. Rol adları zəncirdəki mərtəbədən gəlir, istifadəçinin rolundan yox.
- **Uyğunsuzluq mediası** iki modulda saxlanır: `Disruption (1)` və `ChecklistDisruption (4)`. Hər ikisinin `RefId`-si uyğunsuzluğun ID-sidir. `media.component.ts`-dəki `STORAGE_MODULES` xəritəsinə bax.
- **Ərazi bağlantılarının Excel idxalı** wide formatdadır (`Mağaza | User 1 | User 2 …`). Hər sətir mağazanın bütün zəncirini əvəz edir. Bu qəsdən dağıdıcıdır: merge-ə çevirməzdən əvvəl soruş.

## Menyu və icazələr

- Tətbiqin və admin panelinin bir çərçivəsi var: `common/shell` (`ShellComponent`). Sahə route-un `data.area`-sından gəlir (`'ui'` / `'admin'`). Admin formalarının stilləri yalnız admin sahəsində işləyir (`common/shell/admin-area.scss`).
- Menyunun vahid mənbəyi route-ların `data.menu` sahəsidir (`section, order, title, icon, pageKey, group, activeAlso…`). Shell menyunu öz route-unun `children`-ından qurur. Yeni səhifə əlavə edəndə menyunu HTML-də yox, route-da qeyd et.
- Aktiv bənd URL-in ən uzun prefiksinə görə seçilir. Başqa bəndə aid detal səhifəsi üçün həmin bəndə `data.menu.activeAlso` yaz. Səhifə adı brauzer tabında və header-də `data.menu.title`-dan gəlir.
- İcazələr `PermissionService` vasitəsilə `GET /api/me/permissions`-dan gəlir; Admin bütün yoxlamaları keçir. `pageKey` bazadakı `Pages.[Key]` ilə dəqiq uyğun olmalıdır. Açar dəyişsə, həm SQL seed, həm route dəyişməlidir. Yeni açar üçün front deploy-dan **əvvəl** baza seed-i və rol icazələri lazımdır.
- `permissionGuard` və `*hasPermission` mövcuddur. Köhnə `RoleGuard` / `*hasRole` / `data.roles` hələ bir neçə yerdə qalır. Yeni kodda onları yox, icazə qatını işlət.
- `ui.routes.ts` pageKey-i olan hər UI səhifəsinə `permissionGuard` qoşur, menyudan gizlənən səhifə URL ilə də açılmır. Əsas Səhifə (`dashboard`) istisnadır: girişdən sonra hamı ora yönləndirilir.
- `AuthInterceptor` token-i yalnız `environment.apiUrl` origin-inə göndərir.

## Server cavabları və formalar

- Xəta mesajını `shared/utils/api-error.ts` (`apiErrorMessage`) ilə göstər. Server 400/403/409-da istifadəçi üçün mesaj qaytarır (məs. "plan geri qaytarıla bilməz", "bu kodlu mağaza artıq var"). `error` callback-i olmayan subscribe yazma.
- Status dəyişdirən və ya saxlayan düymələr sorğu gedərkən bağlanır (`isSaving` + `finalize`): ikiqat klik iki əməliyyat yaratmasın.
- Cədvəl filtrini `shared/utils/table-filter.ts` (`setFilter`) ilə yaz: boş dəyər açarı silir. Yeni axtarışda `paginator.page = 0`.
- Uyğunsuzluq və cavab siyahıları serverdə səhifələnir. `total` serverdən gəlir, səhifə dəyişəndə yenidən sorğu göndər. İxrac üçün `page = -1`.
- Şəkil yükləmə: `accept` üçün `shared/utils/upload-types.ts` (`ACCEPTED_IMAGE_TYPES`), serverin siyahısı ilə eynidir. Cavabda əvvəl şəkil, sonra cavab göndərilir.
- Mağaza kodu redaktədə dəyişmir: server kodu yeniləmir.
- Bu hesabatlar menyuya qəsdən salınmayıb, əlavə etmə:
  - `checklist-analysis`: data saxtadır;
  - `reports-location`: SQL-i real datada yoxlanmayıb;
  - `nonconformity-analysis`: data mənbəyi yoxdur.

## Stil və UI

- Rəng, şrift ölçüsü, boşluq, radius və kölgə yalnız `src/_tokens.scss`-dəki CSS dəyişənlərindən gəlir (`--accent`, `--text-*`, `--surface-*`, `--border`, `--success|warning|danger|info` + `-soft`/`-text`, `--fs-*`, `--space-*`). Birbaşa hex yazma. Lazım olan rəng yoxdursa, əvvəl orada token yarat.
- Rəng yalnız məna daşıyır. Bir vurğu rəngi (`--accent`) əsas əməliyyat, aktiv və seçilmiş hal üçündür. Status rəngləri yalnız status üçündür. Qradient, dekorativ rəng və rəngli kölgə işlətmə. Məhsul neytraldır: müştəri adı və ya brendi mətndə yazılmır.
- Şriftlər IBM Plex Sans/Mono-dur (`@fontsource`, `angular.json`-da). Kod və ID üçün `.mono` sinfi var. 12px-dən kiçik mətn yoxdur.
- Qrafik rəngləri `shared/utils/chart-colors.ts` ilə `--chart-*` token-lərindən oxunur. Rəng varlığa bağlıdır: yoxlama `series[0]`, uyğunsuzluq `series[1]` (mərcan), uyğunluq faizi `series[2]`. Vəziyyət (həll edilmiş/açıq, risk) status rəngindədir. Palitra sırası rəng korluğu yoxlamasından keçib, dəyişəndə yenidən yoxla.
- ApexCharts-ı yalnız `loadApexCharts()` ilə yüklə: o, kitabxananın hover filtrini söndürür (`lighten` sütunu ağardıb itirirdi). Say oxu üçün `chart-axis.ts` (`integerAxis`). İki fərqli şkalanı bir qrafikdə iki y-oxu ilə göstərmə, ayrı qrafik qur.
- Mətnlər `docs/design/glossary.md`-yə uyğun olmalıdır: Firma, Mağaza, Şöbə, Parol, təsdiq; cümlə registri.
- Təkrarlanan səhifə blokları `src/_design-system.scss`-dədir (`.kpi-*`, `.table-card`, `.table-sticky`). Yeni səhifədə bunları sıfırdan yazma.
  - KPI kartı süzülmüş siyahıya aparırsa, `<a class="kpi-card is-link">` + `.kpi-go` oxu işlət. KPI ikonu yalnız həddi olan göstəricidə `tone-success|warning|danger` alır.
  - Yenidən yükləmə xətti: kartın içində `.list-progress` (cədvəl tərpənməsin deyə `.progress-slot` içində), bloklar arasında `.page-progress`. Komponentdə öz progress sinfini yazma.
- Plan statusunu dəyişən siyahılar (Əməliyyatlar, Yoxlanılmış, Yoxlama təsdiqi) bir komponentdir: `ui/plans/plan-status-table`. Fərqlər `plan-status-page.ts`-dədir (statuslar, keçidlər, mətnlər) və route-un `data.statusPage`-i ilə verilir. Yeni keçid və ya ekran üçün oraya konfiqurasiya əlavə et, komponenti kopyalama. Firma ixtiyaridir: server sorğunu istifadəçinin firmalarına salır.
- Uyğunluq faizinin həddləri (85/70) yalnız `shared/utils/compliance.ts`-dədir. Şablonda `value | complianceTone` pipe-ı işlət (nişan: `.faiz-chip` + `'faiz-' + tone`), faizi rəngləyən yerdə `<app-compliance-legend />` göstər. Həddi rəqəmlə yazma.
- Ortaq komponentlər (`shared/`), öz variantını yazma:
  - başlıq: `<app-page-header>`. Ad route-un `data.menu.title`-ından gəlir, düymələr `headerActions` ilə ötürülür. `.report-page-header` köhnəlib;
  - status: `<app-status-chip [planStatus]>` / `[disruptionStatus]`. Etiket və ton yalnız `shared/status/status-meta.ts`-dədir. Status düymələrinin feli, ikonu və dialoq mətni `status-actions.ts`-dədir (`STATUS_ACTIONS`, `statusActionConfirm`);
  - rədd/geri qaytarma səbəbi: `<app-status-reason subject="plan|disruption" [change]>` (`shared/status/status-reason.component.ts`). Rədd və geri qaytarma əməliyyatları səbəb tələb edir, səbəb status sorğusunun `reason` sahəsində gedir;
  - siyahının boş/xəta halı: `<app-list-state state="idle|empty|error" (retry)>`.
- Təsdiq tələb edən əməliyyat `ConfirmDialogService.confirm()` ilə soruşulur (`shared/components/confirm-dialog`). Təsir olunan qeydləri `items`-də, səbəbi `reason`-da ver. `undefined` ləğv deməkdir. Əl ilə popup yazma.
- Bildiriş yalnız `NotificationService` ilədir. Müddəti növ təyin edir: xəta bağlanana qədər qalır, xəbərdarlıq 8 s, qalanı 4 s.
- Tarixi istifadəçiyə `appDate` pipe ilə göstər (`'date'` / `'datetime'`, Bakı vaxtı). `LOCALE_ID` `az`-dır: serverə gedən tarix/rəqəm stringi rəqəmli pattern (`yyyy-MM-dd`) və ya açıq `'en-US'` ilə qurulur.
- Filtr, səhifə nömrəsi və seçilmiş qeyd URL-də saxlanır: `shared/utils/query-state.ts` (`queryString/queryNumber/queryNumbers/queryDate`, `writeQueryState`). Router state və sessionStorage işlətmə.
- Hər ikon düyməsində (`.action-btn`) azərbaycanca `aria-label` olur və düymədəki feli təkrarlayır.
- Filtr və düymələr üçün `styles.scss`-dəki qlobal sistemi işlət, öz siniflərini uydurma:
  - filtr kartı: `.g-filter-card` › `.g-filter-grid` › `.g-filter-field` / `.g-filter-field-wide` › `.g-field-label` + `.g-modern-field`;
  - düymələr: `.g-search-btn`, `.g-secondary-btn`, `.g-export-btn`, `.g-approve-btn` / `.g-reject-btn`.
- Form sahələri həmişə `mat-form-field` + `.g-modern-field` olsun. Adi `<input>` ilə `mat-select`-i qarışdırma, hizalama pozulur. Minlərlə option olan siyahıda `mat-select` işlətmə, axtarışlı məhdud siyahı qur.
- Dark mode və RTL yoxdur, qəsdən silinib. Onlar üçün kod yazma.
- Tək ikon dəsti Material Symbols Outlined-dır. `<mat-icon>` də onu işlədir (`MAT_ICON_DEFAULT_OPTIONS`, `app.config.ts`). Başqa ikon şrifti əlavə etmə.
- Form sahəsinin xəta sətri boş halda yer tutmur və sahə xətalı olanda görünür (`styles.scss`, `.mat-mdc-form-field`). Komponentdə `subscript-wrapper`-i `display: none` ilə gizlətmə.
- Bütün kök provider-lər `app.config.ts`-dədir, `main.ts` yalnız onu işlədir. Material provider-lərini (məs. `MatPaginatorIntl`) kökdə qeydə alma: bütün modulu başlanğıc bundle-a çəkir. Onlar `core/shell-providers.ts`-dədir və lazy route-larda verilir.
- Yeni asılılıq yalnız pulsuz, açıq lisenziyalı ola bilər (MIT/Apache). Audit fotolarını xarici servislərə göndərmə.

## Performans

- `pdfmake` və `xlsx`-i heç vaxt statik import etmə. `shared/services/file-export.service.ts`-i inject et, o kitabxanaları dinamik yükləyir.
- `ui.routes.ts`-də səhifələr `loadComponent` ilə yüklənir. Statik `component:` əlavə etmə: leaflet və fullcalendar ümumi chunk-a qayıdar.

## Redaktə

- Fayllar UTF-8, BOM-suzdur. Windows PowerShell 5.1 ilə toplu redaktə Azərbaycan hərflərini korlayır. Edit alətini və ya Node işlət.
- `sed -i` faylı rename ilə əvəz edir və Windows-da `ng serve` bunu görmür. Edit alətini işlət.

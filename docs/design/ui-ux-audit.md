# UI/UX auditi və təkmilləşdirmə planı

**Tarix:** 2026-11-25.

**Əhatə:** bütün web tətbiq — çərçivə, planlar, yoxlamalar, cavablar, uyğunsuzluqlar, hesabatlar, profil və admin.

**Metod:** yalnız mənbə kodu oxunub. Brauzerdə real data ilə yoxlanmayıb, çünki VPN lazımdır. Görünüşə aid bəndlər koddan çıxarılmış ehtimaldır və aşağıda belə işarələnib.

## Qəbul olunmuş istiqamət

- **Məhsul neytraldır.** Bir neçə market şəbəkəsinə satılır. Müştəri brendi yalnız loqo yeri kimi görünür, müştəri adı mətndə keçmir.
- **Rəng = məna.** Baza qrafit və isti-boz tonlardır. Bir vurğu rəngi var: tünd teal, bənövşəyi və adi mavi olmayan. Rəngin qalanı yalnız statusu bildirir.
- **Şrift.** Mətn üçün IBM Plex Sans, kodlar və ID-lər üçün Plex Mono. `ə ğ ş ı` hərflərinin necə göründüyü yoxlanmalıdır.
- **Səhifə başlığı sadədir:** başlıq, bir sətirlik izah, sağda əməliyyatlar. Qradient və dekorativ dairə yoxdur.
- **Dark mode və RTL yoxdur.**

## Ümumi diaqnoz

1. **Növbəti addım görünmür.** Heç bir siyahı və ya detal ekranı "növbə kimdədir, nə vaxtdan, növbəti addım nədir" sualına cavab vermir. Onay zəncirli məhsulda bu ən böyük UX boşluğudur.
2. **Status qərarları dağınıqdır.** Eyni hərəkətin adı, rəngi, təsdiqi və səbəb tələbi hər ekranda fərqlidir. "Rədd" sözü üç fərqli iş görür:
   - planı -1 edir;
   - yoxlamanı mobilə qaytarır (3→2);
   - yekunlaşmış planı yenidən açır (4→2).
3. **Ekranların üç nəsli yanaşı yaşayır:**
   - köhnə şablon ekranlar (`mat-card` + `badge span`);
   - hesabatlar (qradient başlıq və öz filtr sinifləri);
   - yeni nümunələr: `disruption-tracking` və `location-structure`.

   Yeni nümunələr istinad götürülməli, qalan ekranlar onlara köçürülməlidir.
4. **Vəziyyətlər bir-birindən ayrılmır.** Xəta boş nəticə kimi görünür. Yükləmə köhnə datanı silir. Bir çox `subscribe`-da `error` callback-i yoxdur. Toast 4 saniyəyə itir.
5. **Şablon qalıqları çoxdur.** `_ui-kit.scss` 5226 sətirdir. Header SCSS-i 941 sətirdir, halbuki header-də cəmi 2 idarə elementi var. Admin shell əsas shell-in surətidir. UI-da "AuditPro" brendi və "maliyyə idarəetməsi" mətni qalıb.
6. **Əlçatanlıq zəifdir:**
   - fokus göstəricisi qlobal silinib;
   - ikon düymələrində `aria-label` yoxdur;
   - klikli `span` və `div`-lər, əl ilə yazılmış popup-lar var;
   - status chip-lərinin və köməkçi mətnin kontrastı AA-dan aşağıdır.
7. **Terminlər qarışıqdır.** Bir anlayış üçün bir neçə söz işlənir:
   - Firma / Müəssisə / Market Şəbəkəsi;
   - Mağaza / Lokasiya / Ərazi;
   - Parol / Şifrə;
   - Onay / Təsdiq.

   Bəzi mətnlər ingiliscədir: "Deadline", "Logout", "Show password". "Puanlama" sözü türkcədir.

---

## Mərhələ 0 — Səhvlər (dizayndan asılı deyil, dərhal düzəldilə bilər)

> **Status (2026-11-25):** 16 bəndin hamısı düzəldildi. Production build və `location-structure` testləri (17/17) keçdi. Brauzerdə real data ilə yoxlanmayıb.
>
> **Qeydlər:**
> - Hesabat ortası çəkili hesablanır (Σ faktiki / Σ normativ, `shared/utils/compliance.ts`). Bütün sətirlər `page = -1` ilə çəkilir.
> - Qlobal `.g-modern-field` stili `mat-error`-u gizlədir. Ona görə məcburi filtr boş olanda sahə qırmızı haşiyə alır və xəbərdarlıq bildirişi çıxır, sahənin altında mətn görünmür. Bu, Mərhələ 1-də həll olunur.
> - Admin əlavə formalarında "İmtina" düyməsi hələ də qırmızıdır (`color="warn"`). Bu, Mərhələ 1-də düzəlir.

| # | Problem | Yer | Həcm |
|---|---|---|---|
| 0.1 | Formun içindəki "Ləğv Et" düyməsində `type` yoxdur. Basanda form submit olur və dəyişiklik saxlanır. | `disruption-middle-details.component.html:260` | S |
| 0.2 | Hesabatlarda orta faiz və Excel/PDF ixracı yalnız açıq səhifənin 10 sətrini götürür. Orta faiz çəkisiz hesablanır. | `main-category-compliance.component.ts:214-246`, `branch-scoring.component.ts:218-248` | S |
| 0.3 | "Hamısını seç" axtarışla gizlənmiş müfəttişləri də seçir. Nəticədə plan gözlənilməz insanlara yaradılır. | `plan-user-list.component.ts:92-109` | S |
| 0.4 | Dashboard-da API xətası "məlumat yoxdur" kimi göstərilir. | `ui-dashboard.component.ts:266-291` | S |
| 0.5 | Təqvim 3, 4 və 5 statuslarını "Bilinmir" kimi boz göstərir. Ağ mətnin kəhrəba və yaşıl fonda kontrastı 2.1–2.5:1-dir. | `plan-calendar.component.ts:123-127, 252-255, 336-342` | S |
| 0.6 | Cavablandırılmamış Bəli/Xeyr sualı qırmızı "Xeyr" kimi görünür. | `inspection-section.component.ts:113-116` | S |
| 0.7 | Status düymələri sorğu gedərkən bağlanmır, ikiqat klik mümkündür. | `plans-approve`, `inspection-approve`, `plan-actions:148`, `plan-checked`, `answer-approve-details:103`, `disruption-middle-details`; admin-də `location-add`, `section-add`, `category-add`, `question-add` | S |
| 0.8 | Xətalar səssiz udulur: `error` callback-i yoxdur və ya xəta yalnız `console.log`-a yazılır. | `disruption-list.ts:131-202`, `disruption-middle.ts:242-302`, `plans-approve.ts:117`, `plan-create.ts:327`, `inspection-details.ts:88`, `locations.ts:192-352`, `section-add`, `question-add`, `category-add` | S |
| 0.9 | Firma seçilmədən "Axtar" basılanda heç nə olmur. Səbəb yalnız konsola yazılır. | `plans-approve.ts:171`, `plan-actions.ts:165`, `plan-checked.ts:168`, `inspections-list.ts:217`, `answers.ts:124`, `disruption-list.ts:182` | S |
| 0.10 | `plans/approve` route-unda `pageKey` yoxdur. Səhifə icazəsiz açılır və `plan-actions`-un dublikatıdır. Silinməlidir. | `ui-pages.routes.ts:91-94` | S |
| 0.11 | Ərazi Bağlantılarında Excel idxalı ön baxış və təsdiq olmadan zəncirləri dərhal əvəz edir. İxrac düyməsinin adı "Strukturu yüklə"dir. | `location-structure.component.ts:793-864`, `.html:116` | M |
| 0.12 | Təsdiq dialoqunda rənglər tərsdir: "Ləğv et" qırmızı, "Bəli, sil" vurğu rəngindədir. Passiv etmə əməliyyatında mətnlər bir-birinə zidddir. | `confirm-dialog.component.html:12-17`, `user-permission.component.ts:197-206` | S |
| 0.13 | Səhifə açarı (`pageKey`) sərbəst redaktə olunur. Səhv dəyişiklik səhifəni hamıdan gizlədir. | `page.component.html:37-51`, `.ts:143-170` | S |
| 0.14 | Bir neçə detal ekranında yükləmə xəta olanda sonsuz fırlanır. Plan detalında hər müfəttişə saxta avatar və "Firma Logosu" yer tutucusu göstərilir. | `inspection-section.ts:86-94`, `plan-info-section.ts:25`, `.html:149` | S |
| 0.15 | Plan yaratmada sonuncu sətir silinə bilir, bundan sonra submit səssizcə heç nə etmir. Keçmiş tarix seçilə bilir. | `plan-create.component.html:34, 69-74`, `.ts:360-409` | S |
| 0.16 | Uyğunsuzluq redaktəsində şəkil cavabdan **sonra** göndərilir. Qayda əksinədir: əvvəl şəkil, sonra cavab. `accept` `ACCEPTED_IMAGE_TYPES` əvəzinə `image/*`-dir. | `disruption-middle-details.ts:326-366`, `.html:255` | S |

## Mərhələ 1 — Bünövrə (görünüş burada dəyişir)

1. **Tək token faylı.** `src/styles/_tokens.scss` yaradılır, yalnız kebab-case CSS dəyişənləri ilə:
   - `--color-text*`;
   - `--surface-*`;
   - `--accent*`;
   - `--status-{success|warning|danger|info|neutral}-{fg|bg|border}`;
   - `--space-1…8` (4px addımla);
   - `--radius-*`;
   - `--text-12…24`;
   - `--font-sans`, `--font-mono`.

   `styles.scss`-dəki camelCase tokenlər və `$gf-*` dəyişənləri buraya bağlanır, köhnə adlar silinir. Material teması `mat.theme()` ilə eyni tokenlərdən qurulur və `azure-blue` prebuilt teması çıxarılır.
2. **Kontrast.** Muted mətn və status `fg`/`bg` cütləri ən azı 4.5:1 olmalıdır. Hazırda `--text-muted` 2.5:1, status chip-ləri 3.6–4.1:1, sidebar alt başlıqları 3.0:1-dir.
3. **Tipoqrafiya şkalası.** 12 / 13 / 14 / 16 / 20 / 24 px. 12px-dən kiçik mətn qalmır. Hazırda layihədə 33 fərqli ölçü var.
4. **Fokus.** `styles.scss:58, 96-98`-dəki `outline: 0 !important` silinir, yerinə qlobal `:focus-visible` qaydası yazılır.
5. **Ikonlar.** Bir ikon dəsti saxlanır: Material Symbols. Material Icons və Remixicon çıxarılır. Remixicon glif kodu ilə işlənir, silməzdən əvvəl istifadə yerləri axtarılmalıdır.
6. **Şablon qalıqlarının təmizlənməsi:**
   - header və sidebar SCSS-ində işlənməyən bloklar;
   - `_ui-kit.scss`-də istifadə olunmayan bölmələr;
   - RTL və dark mode qalıqları;
   - `internal-error` komponenti;
   - `working-schedule` komponenti;
   - `inspections-result` komponenti;
   - köhnə redirect route-lar.
7. **Terminlər lüğəti.** `docs/design/glossary.md` yazılır və bütün mətnlər ona uyğunlaşdırılır. Lüğətdə bu sözlər olur:
   - Firma, Mağaza, Şöbə, Kateqoriya, Təsnifat, İcazə qrupu, Parol, Son tarix;
   - Təsdiqlə, Rədd et, Mobilə qaytar, Yenidən aç, Ləğv et (yalnız pəncərəni bağlamaq üçün), Yadda saxla, Sil, Passiv et.

   Mətndə qalan "AuditPro", "Avrora Audit", `@azersun.com`, "BazarStore" adları çıxarılır, brend yalnız loqo yerindən gəlir.

## Mərhələ 2 — Ortaq komponentlər və nümunələr

1. **`PageHeader` + `TitleStrategy` + breadcrumb.** Hamısı `data.menu.title`-dan oxuyur. Brauzer tabının adı: "Səhifə · Audit". Bu komponent üç başlıq üslubunu birləşdirir: qradient başlıq, admin breadcrumb və hero-banner.
2. **Status modeli.** `shared/utils/status-transitions.ts` faylında hər keçid üçün fel, ikon, ton, `requiresReason` və `confirm` qeyd olunur. Bir `status-chip` komponenti yazılır. Etiket statusu "növbə kimdədir" formasında deyir, məsələn "Baş müfəttiş onayında". "Müfəttiş onaylayıb" kimi yazılmır.
3. **Ortaq təsdiq dialoqu.** `shared/`-də yerləşir və `danger` variantı olur. Dialoq neçə qeydə və hansı mağazalara təsir etdiyini göstərir. Rədd et, Mobilə qaytar və Yenidən aç üçün səbəb sahəsi məcburidir. İlkin fokus "Ləğv et" düyməsində olur. Əl ilə yazılmış popup-lar `MatDialog`-a köçürülür: `answer-details`, `answer-approve-details`, `disruption-middle-details`.
4. **Üç vəziyyət.** Hər siyahıda bunlar ayrı göstərilir:
   - "hələ axtarılmayıb";
   - "nəticə yoxdur";
   - "yüklənmədi" (`role="alert"` + "Yenidən cəhd et").

   Yükləmə zamanı köhnə data yerində qalır, nazik progress xətti göstərilir. Tam ekran overlay yalnız ilk yükləmədə işlənir.
5. **Bildirişlər.** Xəta toast-u özbaşına bağlanmır, xəbərdarlıq 8 saniyə qalır. Toast yuxarı sağda çıxır və rəngini status tokenlərindən alır.
6. **Tarix və rəqəm formatı.** `az` locale + `LOCALE_ID`. `appDate` pipe iki formatda işləyir: `dd.MM.yyyy` və `dd.MM.yyyy HH:mm`, Bakı vaxt zonası ilə. Faiz bir onluq rəqəmlə göstərilir (`87,5%`). Kodlar Plex Mono ilə yazılır.
7. **URL-də vəziyyət.** Filtrlər, səhifə nömrəsi və seçilmiş qeyd query parametrlərində saxlanır. Detal səhifələri ID-ni route və ya query-dən alır, router state və sessionStorage-dən yox. Bununla səhifə yenilənəndə və link paylaşılanda iş itmir.
8. **Cədvəl standartı:**
   - `matSort` serverdə işləyir;
   - başlıq sticky qalır;
   - ikon düymələri 40–44px olur və azərbaycanca `aria-label` daşıyır;
   - media triggeri say göstərən `button`-dur (`inspection-section`-dakı `media-btn` nümunəsi);
   - checkbox etiketləri azərbaycancadır.
9. **Tək shell.** Admin və UI üçün ayrı-ayrı header və sidebar surətləri əvəzinə bir `ShellComponent` olur, `area` parametri ilə. Sidebar-da:
   - detal səhifələrində də uyğun menyu bəndi aktiv görünür;
   - aktiv qrup açıq qalır;
   - dar rail rejimi yadda saxlanır;
   - planşetdə drawer backdrop və Esc ilə bağlanır.

   Profil menyusunda "Admin paneli ↔ Tətbiq" keçidi olur.

## Mərhələ 3 — Axınlar (ekran-ekran)

İstinad nümunələri: `disruption-tracking` (siyahı + yan panel) və `location-structure` (axtarışlı seçici, izah panelləri).

1. **Dashboard → "Diqqət tələb edir".** Yuxarıda rola görə iş növbəsi göstərilir: təsdiq gözləyənlər, müddəti keçən uyğunsuzluqlar, vaxtı bitən planlar. Hər birinin yanında say və siyahıya link olur. KPI-lar klikləndikdə süzülmüş siyahı açılır. KPI-ların rəngi həddə görə verilir, hər karta sabit rəng verilmir. Qrafik növləri azaldılır.
2. **Onay ekranları.** Bunlar `plans-approve`, `plan-actions`, `plan-checked` və `inspection-approve`-dur. Dördü demək olar eyni koddur və bir `plan-status-table` komponentində birləşir, icazə verilən keçidlər input kimi ötürülür. Cədvələ status sütunu əlavə olunur. Qərar üçün lazım olan sütunlar da gəlir: bal, uyğunsuzluq sayı, bitmə vaxtı. Toplu əməliyyat düyməsində neçə qeyd seçildiyi yazılır.
3. **Cavab təsdiqi.** Mağazanın cavabı, qeydi və fotosu cədvəldə görünür. Hazırda bunlar yalnız modalda görünür və təsdiqləyən onları açmadan qərar verir. Checkbox-lar ya toplu əməliyyata bağlanır, ya da silinir. Siyahıda "Gözləyən" sayı göstərilir.
4. **Müfəttiş təsdiqi (`disruption-middle`).** Səhifə açılan kimi istifadəçinin öz növbəsi yüklənir, firma seçimi ixtiyari olur. Cədvəldə ən köhnə qeydin yaşı ("5 gündür") və mərhələ göstərilir. Düymə mətni növbəti addımı deyir: "Yekun təsdiq ver".
5. **İzləmə.** Cədvəldə "6 gündür kimdədir" və "3 gün gecikir" kimi məlumatlar görünür. `stageSince` üzrə sıralama əlavə olunur. Yan paneldə:
   - fokus tələsi;
   - ↑/↓ ilə əvvəlki və növbəti qeydə keçid;
   - cari onaylayıcı üçün Təsdiq və Rədd düymələri.
6. **Hesabatlar.** Hər hesabat bir suala cavabla başlayır:
   - KPI-lar əvvəlki dövrlə fərqi göstərir;
   - sonra "ən zəif 10" bar qrafiki gəlir;
   - sonra sıralanan cədvəl gəlir.

   Hədd göstəricisinin legend-i olur. Filtrlər qlobal `g-*` sisteminə keçir, "Təmizlə" düyməsi əlavə olunur.
7. **Mağaza profili.** Ardıcıllıq belədir:
   - mağaza adı və kodu;
   - 3 KPI (orta nəticə, açıq, gecikən), hər biri filtrli linklə;
   - trend qrafiki;
   - son yoxlamalar.

   Faiz və say eyni oxda göstərilmir. Qrafik boş olanda köhnə qrafik ekranda qalmır. Təkrarlanan rəqəmlər, boş menyu və ölü düymələr silinir.
8. **Yoxlama detalı.** Başlıqda mağaza adı və kodu, status chip-i və "Növbəti addım: …" sətri olur. Checklist-də bunlar əlavə olunur:
   - "Yalnız uyğunsuz" süzgəci;
   - "Hamısını aç" düyməsi;
   - klaviatura ilə açılan akkordeon.
9. **Plan yaratma.** Səhifənin başında seçilmiş firma və müfəttişlər chip kimi görünür. Hər plan sətri sadə cədvəl sətridir, expansion panel işlənmir. Düymələr "+ Mağaza əlavə et" və "N plan yarat" adlanır.
10. **Admin:**
    - İstifadəçi yaratma bir axın olur: yaratma dialoqu → redaktə səhifəsi. "Rol və Firma Təyinatı" menyu bəndi silinir. İstifadəçi seçimi axtarışlı və nəticə sayı məhdud siyahıdır.
    - İcazə matrisində hələ tətbiq olunmayan CRUD sütunları gizlədilir və ya "tətbiq olunmur" etiketi alır. Sətirlər bölmələrə qruplanır. Hər qrupun yanında üzv sayı göstərilir.
    - Suallar "Audit Strukturu"nda dördüncü tab olur, firmaya görə süzülür və "Şöbə › Kateqoriya" yolunu göstərir.
    - CRUD ekranları üçün bir qayda olur: 8 sahəyə qədər dialoq, daha çox olarsa səhifə. Düymə sırası hər yerdə eynidir: "Ləğv et" (neytral) → "Yadda saxla". Saxlama düyməsi bağlanmır, basılanda xətalar göstərilir.
    - Filtrlər cədvəlin üstündə görünür, gizli yan paneldə olmur.

## Backend asılılıqları

- Rədd, qaytarma və yenidən açma əməliyyatlarında səbəbi saxlamaq üçün sahə. Bu, plan, yoxlama və uyğunsuzluq üçün lazımdır.
- `inspectionPlans/getDetails`-ə bal və uyğunsuzluq sayı.
- Hesabat orta faizinin serverdə çəkili hesablanması: Σfaktiki / Σnormativ.
- `disruption-middle` üçün istifadəçinin öz növbəsi (firma filtri olmadan).

## Yoxlanmayanlar

- Bütün bəndlər koddan çıxarılıb. Görünüş və ölçü haqqında olanlar (375 / 768 / 1280px, overlay mövqeyi, böyük `mat-select`) real data ilə brauzerdə təsdiqlənməlidir. Bunun üçün VPN lazımdır.
- 0.1 (`Ləğv Et` formu göndərir) və fokusun silinməsi (`styles.scss:58, 96-98`) kodda əl ilə yoxlanıb və təsdiqlənib.

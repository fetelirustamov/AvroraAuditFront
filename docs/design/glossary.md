# Terminlər lüğəti

Bu sənəd interfeysdə işlənən sözləri müəyyən edir. Yeni mətn yazanda, mövcud mətni dəyişəndə və kodu nəzərdən keçirəndə buna bax. Bir anlayışın bir adı olur.

Məhsul bir neçə pərakəndə şəbəkəyə satılır. Interfeys dili Azərbaycan dilidir.

## Brend

- Mətndə müştəri və ya məhsul adı yazılmır: "Tamstore", "BazarStore", "Avrora", "Avrora Audit", "AuditPro" və s.
- Brend yalnız loqo yerindən gəlir.
- Nümunə mətnlər neytral olur:
  - e-poçt: `ad.soyad@sirket.az`;
  - firma adı: "Məs: Firma adı".

## Anlayışlar

Soldakı söz işlənir. Sağdakılar işlənmir.

| Termin | İşlənməyən variantlar | Qeyd |
|---|---|---|
| **Firma** | Müəssisə, Müəsisə, Market şəbəkəsi, Şəbəkə, Market, Direktorluq (`firmId` filtri üçün) | Sistemdəki müştəri təşkilatı (pərakəndə şəbəkə). Cəmi: "Firmalar". "Şəbəkə" internet bağlantısı mənasında da işlənmir: "İnternet bağlantısını yoxlayın". |
| **Mağaza** | Lokasiya, Filial, Ərazi, Məkan | Tək satış nöqtəsi. "Mağaza kodu", "Mağaza adı", "Mağaza profili". |
| **Bölgə** | Ərazi (bölgə mənasında), Bölgəsi | Mağazaların qrupu. Admin mağaza formunda sahənin adı "Region"-dur. |
| **Şöbə** | Seksiya | Mağazanın şöbəsi. Cəmi: "Şöbələr". |
| **Kateqoriya** | Kategoriya | Şöbənin içindəki sual qrupu. |
| **Təsnifat** | Tasnifat | Hesabatlarda: "Əsas təsnifat", "Uyğunsuzluq təsnifatı". |
| **İcazə qrupu** | Yetki qrupu, Səlahiyyət qrupu, İzin qrupu, Rol | Cəmi: "İcazə qrupları". Qrupun tərkibi: "İcazələr". "Rol" yalnız "Rol və firma təyinatı" səhifəsinin adında qalır. |
| **Parol** | Şifrə | "Parolu göstər", "Parolu sıfırla". |
| **E-poçt** | Email, E-mail | |
| **Son tarix** | Deadline | |
| **Əsas səhifə** | Dashboard | Həm tətbiqdə, həm admin panelində. |
| **Çıxış** | Logout | |
| **Təsdiq** | Onay | Feil: "təsdiqlə", "təsdiq gözləyir", "təsdiq zənciri", "1-ci təsdiq". |
| **Qiymətləndirmə** | Puanlama | "Şöbə qiymətləndirməsi". |
| **İxrac** | Export | "İxrac et", "İxrac üçün məlumat yoxdur". |

**İstisna:** "Ərazi bağlantıları" səhifəsinin və menyu bəndinin adı belə qalır. Bu səhifədə də tək satış nöqtəsi "mağaza" adlanır.

## Düymələr (əməliyyatlar)

Düymə nə etdiyini deyir. Eyni fel həmişə eyni işi görür. Tooltip, `aria-label` və bildiriş düymədəki feli təkrarlayır.

| Düymə | Nə edir |
|---|---|
| **Təsdiqlə** | Qeydi növbəti mərhələyə ötürür: plan 1→2, yoxlama 3→4, uyğunsuzluq 0→1→2. |
| **Rədd et** | Qeydi rədd edir: plan →-1, uyğunsuzluq →-1. Cavab təsdiqində cavabı rədd edir. |
| **Mobilə qaytar** | Yoxlanılmış planı müfəttişin mobilinə geri göndərir (3→2). |
| **Yenidən aç** | Yekunlaşmış planı yenidən açır (4→2). |
| **Müfəttişə qaytar** | Uyğunsuzluğu baş müfəttişdən müfəttişə qaytarır (1→0). |
| **Yadda saxla** | Formdakı dəyişikliyi saxlayır. Admin formalarında "Təsdiqlə" işlənmir. |
| **Əlavə et** | Yeni qeyd yaradır. Siyahı başlığında: "Yeni şöbə", "Yeni firma". |
| **Redaktə et** | Qeydi redaktə formunda açır. |
| **Sil** | Qeydi silir. Həmişə təsdiq dialoqu ilə. |
| **Passiv et** | İstifadəçini passiv edir: silmir, girişi bağlayır. |
| **Axtar** | Filtrləri tətbiq edir. |
| **Təmizlə** | Filtrləri və ya axtarışı sıfırlayır. |
| **Ləğv et** | **Yalnız** dialoqu və ya formu bağlayır, dəyişiklik saxlanmır. Heç vaxt biznes əməliyyatı deyil: planı və yoxlamanı "ləğv etmək" olmaz, onlar "rədd edilir", "mobilə qaytarılır" və ya "yenidən açılır". "İmtina" işlənmir. |
| **İxrac et** | Excel və ya PDF faylı yaradır. |
| **Bax** | Qeydin detalını açır. |

## Statuslar

Status etiketi **növbənin kimdə olduğunu** deyir. Bitmiş hadisə kimi oxunan keçmiş zaman işlənmir.

- Düzgün: "Baş müfəttişin təsdiqində", "Müfəttişin təsdiqində", "Mağazanın cavabında", "Yoxlama təsdiq gözləyir".
- Yanlış: "Müfəttiş onaylayıb", "Yoxlanılıb" (növbə hələ başqasındadırsa).
- Son statuslar keçmiş zamanda qala bilər: "Yekunlaşıb", "Rədd edilib", "Bağlanıb", "Vaxtı bitib".

Uyğunsuzluğun mərhələsi (`STAGE_META`, izləmə ekranı). `disruption-middle-details` eyni etiketləri işlədir.

| Mərhələ | Etiket |
|---|---|
| `INSPECTOR` (status `0`) | Müfəttişin təsdiqində |
| `HEAD_INSPECTOR` (status `1`) | Baş müfəttişin təsdiqində |
| `STORE_ANSWER` | Mağazanın cavabında |
| `CHAIN_APPROVAL` | Zəncirin təsdiqində |
| `RETURNED` | Qaytarılıb, yenidən cavab gözləyir |
| `CLOSED` | Bağlanıb |
| `NO_CHAIN` | Təsdiq zənciri yoxdur |
| `REJECTED` (status `-1`) | Rədd edilib |

| Plan (`InspectionPlans.Status`) | Etiket |
|---|---|
| `1` | Təsdiq gözləyir |
| `2` | Təsdiqlənib |
| `3` | Yoxlama təsdiq gözləyir |
| `4` | Yekunlaşıb |
| `5` | Vaxtı bitib |
| `-1` | Rədd edilib |

## Yazı qaydaları

- **Cümlə registri.** Etiket, düymə, başlıq və sütun adı yalnız ilk sözdə böyük hərflə başlayır: "Yadda saxla", "Giriş et", "Mağaza kodu", "Əsas səhifə". "Yadda Saxla", "Mağaza Kodu", "MAĞAZA KODU" yazılmır. Böyük hərf lazımdırsa CSS (`text-transform`) ilə verilir.
- Xüsusi adlar və qısaltmalar olduğu kimi qalır: "ID", "PDF", "Excel".
- Səhifə başlığı menyudakı adla eyni olur.
- Bildirişlərdə ingilis sözü işlənmir: "Export" yox, "ixrac".
- `aria-label`, `alt` və tooltip də Azərbaycan dilində yazılır: "Profil şəkli", "Sətri seç", "Parolu göstər".
- Ekran oxuyucusu üçün yazılan mətn düymədəki feli təkrarlayır.

## Toxunulmayan şeylər

Bu dəyərlər server və ya fayl kontraktıdır, lüğətə görə dəyişmir:

- route yolları, `pageKey` dəyərləri, API sahə adları, enum və status kodları, CSS sinifləri;
- Ərazi bağlantılarının Excel idxal formatındakı `User 1`, `User 2`… başlıqları (köhnə fayllar oxunmalıdır).

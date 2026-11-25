/**
 * Menyu metadatası route-un `data.menu` sahəsində saxlanır — vahid mənbə budur.
 * Ayrıca menyu konfiqi yoxdur; menyu MenuService tərəfindən route ağacından qurulur.
 */
export interface MenuMeta {
    /** Hansı menyuya aiddir. */
    area: 'app' | 'admin';
    /** Bölmə başlığı (mətn etiketi, məs. "SİSTEM PARAMETRLƏRİ"). */
    section: string;
    /** Bölmə daxilində sıra (kiçik = yuxarıda). Bölmənin özünün sırası minimal item order-dir. */
    order: number;
    /** Menyu link mətni. */
    title: string;
    /** DB-dəki Pages.[Key] ilə DƏQİQ uyğun olmalıdır — görünürlük buna görə yoxlanır. */
    pageKey: string;
    /** Birbaşa link ikonu (material-symbols adı). */
    icon?: string;
    /** Doldurulubsa, eyni bölmə+group olan item-lər bir açılan panel altında birləşir. */
    group?: string;
    /** Group panelinin ikonu. */
    groupIcon?: string;
    /** Group-un bölmə daxilində sırası. */
    groupOrder?: number;
    /**
     * Öz menyu bəndi olmayan səhifələr (bölmə kökünə nisbətən, məs. 'answers/approve-details').
     * Onlar açılanda bu bənd aktiv görünür. Bəndin öz yolunun alt yolları buraya yazılmır:
     * onlar avtomatik uyğunlaşır (bax MenuService.findActive).
     */
    activeAlso?: string[];
}

/** Menyuda birbaşa link (açılan panelsiz). */
export interface MenuLink {
    kind: 'link';
    title: string;
    path: string;
    /** Bu bəndi aktiv edən mütləq yollar: öz yolu + `activeAlso`. */
    matchPaths: string[];
    pageKey: string;
    icon?: string;
    order: number;
}

/** İçində alt-linklər olan açılan panel. */
export interface MenuGroup {
    kind: 'group';
    title: string;
    icon?: string;
    order: number;
    items: MenuLink[];
}

export type MenuEntry = MenuLink | MenuGroup;

export interface MenuSection {
    label: string;
    order: number;
    entries: MenuEntry[];
}

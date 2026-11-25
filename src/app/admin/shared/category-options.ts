import { CategoryDto } from '../models/category.model';
import { SectionDto } from '../models/section.model';

/** Kateqoriya seçimi: "Şöbə › Kateqoriya" yolu və firması (kateqoriyanın firması şöbədən gəlir). */
export interface CategoryOption {
    id: number;
    path: string;
    firmId: number | null;
}

/**
 * Kateqoriyaları şöbə yolu ilə qaytarır, yola görə sıralanmış.
 * Silinmiş və ya tapılmayan şöbənin kateqoriyası "—" yolu və firmasız qalır.
 */
export function categoryOptions(categories: CategoryDto[], sections: SectionDto[]): CategoryOption[] {
    const sectionById = new Map(sections.map(s => [s.id, s]));
    return categories
        .map(c => {
            const section = c.sectionId != null ? sectionById.get(c.sectionId) : undefined;
            const sectionName = section?.sectionName ?? c.sectionName ?? '—';
            return { id: c.id, path: `${sectionName} › ${c.categoryName}`, firmId: section?.firmId ?? null };
        })
        .sort((a, b) => a.path.localeCompare(b.path, 'az'));
}

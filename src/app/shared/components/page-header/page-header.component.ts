import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink, UrlTree } from '@angular/router';
import { routePageTitle } from '../../../core/app-title.strategy';

/**
 * Səhifə başlığı: ad, bir sətirlik izah və sağda əməliyyatlar.
 *
 * `title` verilməsə, ad aktiv route-un `data.menu.title`-ından oxunur (menyudakı adla eyni olur).
 * `backLink` verilsə, başlığın üstündə "← Siyahıya qayıt" linki çıxır (detal səhifələri üçün).
 * Sağdakı düymələr `headerActions` atributu ilə ötürülür.
 *
 * @example
 * <app-page-header subtitle="Planlanmış yoxlamaların siyahısı">
 *   <button headerActions class="g-export-btn">İxrac et</button>
 * </app-page-header>
 *
 * <app-page-header [title]="'Plan #' + id" backLink="/ui/plans" backLabel="Planlara qayıt" />
 */
@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './page-header.component.html',
    styleUrl: './page-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    /** Səhifə adı. Boşdursa route-un `data.menu.title`-ı götürülür. */
    readonly title = input<string>();
    /** Başlığın altındakı bir sətirlik izah. */
    readonly subtitle = input<string>();
    /** Başlığın solundakı Material Symbols ikonu (adı). */
    readonly icon = input<string>();
    /**
     * Geri linki (`routerLink` dəyəri). Verilməsə link göstərilmir.
     * Filtrli siyahıya qayıtmaq üçün `UrlTree` ver (query parametrləri ilə).
     */
    readonly backLink = input<string | unknown[] | UrlTree>();
    /** Geri linkinin mətni. Standart: "Siyahıya qayıt". */
    readonly backLabel = input<string>();

    // Komponent səhifə ilə birlikdə yaranır: route adı bir dəfə oxunur
    private readonly routeTitle = routePageTitle(inject(ActivatedRoute).snapshot.root) ?? '';

    protected readonly resolvedTitle = computed(() => this.title() || this.routeTitle);
}

import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../auth/auth.service';
import { UserProfileService } from '../../auth/user-profile.service';
import { MenuLink, MenuSection } from '../menu/menu.model';
import { ShellArea } from '../shell/shell.model';

interface SearchItem {
    link: MenuLink;
    /** Bəndin yeri: qrup adı, qrup yoxdursa bölmə adı. Axtarışa da daxildir. */
    context: string;
}

/** Az dilinə uyğun kiçik hərf: "İ" → "i", "I" → "ı". */
const normalize = (text: string) => text.toLocaleLowerCase('az');

/**
 * Shell header-i: menyu düyməsi, səhifə başlığı, menyu üzrə axtarış və profil.
 * Axtarış route-dan qurulan menyunu (data.menu) işlədir, ayrıca siyahı yoxdur.
 */
@Component({
    selector: 'app-header',
    imports: [MatMenuModule, MatIconModule, MatAutocompleteModule, RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
})
export class HeaderComponent {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    readonly profile = inject(UserProfileService);

    readonly area = input.required<ShellArea>();
    readonly menu = input.required<MenuSection[]>();
    /** Desktop-da panel tam açıqdır, mobil-də drawer açıqdır. */
    readonly menuExpanded = input(false);

    readonly menuToggle = output<void>();

    private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

    /** AdminGuard ilə eyni yoxlama: admin panelinə keçid yalnız oraya buraxılan istifadəçiyə göstərilir. */
    readonly canSwitchArea = this.authService.hasRole('Admin');

    readonly query = signal('');

    private readonly searchItems = computed<SearchItem[]>(() =>
        this.menu().flatMap(section => section.entries.flatMap(entry =>
            entry.kind === 'group'
                ? entry.items.map(link => ({ link, context: entry.title }))
                : [{ link: entry, context: section.label }]
        ))
    );

    readonly results = computed(() => {
        const q = normalize(this.query().trim());
        if (!q) return [];
        return this.searchItems().filter(item =>
            normalize(item.link.title).includes(q) || normalize(item.context).includes(q)
        );
    });

    /** Seçimdən sonra sahə boşalır (autocomplete dəyəri inputa yazmasın). */
    readonly clearInput = () => '';

    onSearchInput(event: Event): void {
        this.query.set((event.target as HTMLInputElement).value);
    }

    goTo(link: MenuLink): void {
        this.query.set('');
        this.router.navigateByUrl(link.path);
    }

    focusMenuButton(): void {
        this.menuButton().nativeElement.focus();
    }

    logout(): void {
        this.authService.logout();
    }
}

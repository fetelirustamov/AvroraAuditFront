import { Component } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import { SIDEBAR_OVERLAY_QUERY } from "../../../common/header/header.component";
import { ToggleService } from "../../../common/header/toggle.service";
import { AuthService } from "../../../auth/auth.service";
import { UserProfileService } from "../../../auth/user-profile.service";

interface AdminSearchItem {
  key: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-header',
  imports: [MatMenuModule, MatIconModule],
  templateUrl: './header.component.html',
  // Ümumi görünüş əsas tətbiqin header-i ilə eynidir; burada yalnız axtarış var
  styleUrls: ['../../../common/header/header.component.scss', './header.component.scss']
})
export class HeaderComponent {

  isSidebarToggled = false;

  /** Admin menyusu üzrə sürətli axtarış (bax: sidebar.component.html-dəki eyni siyahı) */
  private readonly ALL_ADMIN_SEARCH_ITEMS: AdminSearchItem[] = [
    { key: 'dashboard', label: 'Əsas səhifə', route: '/admin/dashboard' },
    { key: 'user-permission', label: 'İstifadəçilər (Yeni İstifadəçi əlavə et)', route: '/admin/permissions/user-permission' },
    { key: 'user-add', label: 'Rol və Firma Təyinatı', route: '/admin/permissions/user-add' },
    { key: 'permission-groups', label: 'İcazə qrupları', route: '/admin/permissions/permission-groups' },
    { key: 'structure', label: 'Ərazi Bağlantıları', route: '/admin/permissions/structure' },
    { key: 'master-data', label: 'Audit Strukturu', route: '/admin/master-data' },
    { key: 'questions', label: 'Suallar', route: '/admin/questions' },
    { key: 'locations', label: 'Mağazalar (Audit Strukturu)', route: '/admin/master-data' },
    { key: 'firms', label: 'Firmalar', route: '/admin/firms' },
    { key: 'pages', label: 'Səhifələr', route: '/admin/pages' }
  ];

  searchQuery = '';
  searchResults: AdminSearchItem[] = [];
  showResults = false;

  constructor(
    private toggleService: ToggleService,
    private authService: AuthService,
    private router: Router,
    public profile: UserProfileService,
  ) {
    this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
      this.isSidebarToggled = isSidebarToggled;
    });
    // Kiçik ekranda açıq panel naviqasiyadan sonra bağlanır.
    // Masaüstündə `.active` yığılmış zolaqdır, ona toxunulmur.
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isSidebarToggled && window.matchMedia(SIDEBAR_OVERLAY_QUERY).matches) {
        this.toggleService.toggle();
      }
    });
  }

  toggle() {
    this.toggleService.toggle();
  }

  // Admin menyusu üzrə sürətli naviqasiya axtarışı.
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.searchQuery = value;
    if (!value) {
      this.searchResults = [];
      this.showResults = false;
      return;
    }
    this.searchResults = this.ALL_ADMIN_SEARCH_ITEMS
      .filter(item => item.label.toLowerCase().includes(value));
    this.showResults = true;
  }

  onSearchFocus(event: Event) {
    if (this.searchQuery) this.onSearchInput(event);
  }

  onSearchSubmit(event: Event) {
    event.preventDefault();
    if (this.searchResults.length > 0) this.goToResult(this.searchResults[0]);
  }

  goToResult(item: AdminSearchItem) {
    this.router.navigate([item.route]);
    this.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
  }

  // Nəticəyə klik "blur"dan əvvəl işləsin deyə kiçik gecikmə (mousedown ilə əvəzləndiyi üçün adətən lazım olmur,
  // amma toxunma cihazlarında ehtiyat üçün saxlanılıb).
  closeSearchResults() {
    setTimeout(() => this.showResults = false, 150);
  }

  logout() {
    this.authService.logout();
  }
}

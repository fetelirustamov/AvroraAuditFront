import { NgClass, NgIf } from "@angular/common";
import { Component, HostListener } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { NavigationEnd, Router } from "@angular/router";
import { ToggleService } from "../../../common/header/toggle.service";
import { CustomizerSettingsService } from "../../../customizer-settings/customizer-settings.service";
import { filter } from "rxjs";
import { AuthService } from "../../../auth/auth.service";

@Component({
  selector: 'app-header',
  imports: [MatButtonModule, MatMenuModule, NgClass, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  // isSidebarToggled
  isSidebarToggled = false;

  // isToggled
  isToggled = false;

  /** JWT claims (Name, Surname, Role, Email, …) — UI header ilə eyni mənbə */
  userInfo: Record<string, unknown> | null = null;

  constructor(
    private toggleService: ToggleService,
    public themeService: CustomizerSettingsService,
    private authService: AuthService,
    private router: Router
  ) {
    this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
      this.isSidebarToggled = isSidebarToggled;
    });
    // Subscribe to router events to toggle the sidebar on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Check if the sidebar is currently toggled and if so, toggle it
      if (this.isSidebarToggled) {
        this.toggleService.toggle(); // Close the sidebar if it's open
      }
    });
    this.themeService.isToggled$.subscribe(isToggled => {
      this.isToggled = isToggled;
    });

    this.userInfo = this.authService.getUserInfo();
  }

  /** Header düyməsində: ad, yoxdursa email */
  get profileTriggerLabel(): string {
    const u = this.userInfo;
    if (!u) return '';
    const name = u['Name'];
    if (typeof name === 'string' && name.trim()) return name.trim();
    const email = u['Email'];
    return typeof email === 'string' ? email : '';
  }

  /** Dropdown başlığı: tam ad */
  get profileFullName(): string {
    const u = this.userInfo;
    if (!u) return '';
    const parts = [u['Name'], u['Surname']]
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map(x => x.trim());
    if (parts.length) return parts.join(' ');
    const email = u['Email'];
    return typeof email === 'string' ? email : '';
  }

  /** Rol sətri (JWT Role, vergüllə ayrılmış ola bilər) */
  get profileRoleLine(): string {
    const u = this.userInfo;
    if (!u) return '';
    const role = u['Role'];
    if (typeof role !== 'string' || !role.trim()) return '';
    return role
      .split(',')
      .map(r => r.trim())
      .filter(Boolean)
      .join(', ');
  }

  // Burger Menu Toggle
  toggle() {
    this.toggleService.toggle();
  }

  // Settings Button Toggle
  settingsButtonToggle() {
    this.themeService.toggle();
  }

  // Header Sticky
  isSticky: boolean = false;
  @HostListener('window:scroll')
  checkScroll() {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (scrollPosition >= 50) {
      this.isSticky = true;
    } else {
      this.isSticky = false;
    }
  }

  logout() {

    this.authService.logout();
  }

}
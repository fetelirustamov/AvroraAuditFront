import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ToggleService } from './toggle.service';
import { NgClass } from '@angular/common';
import { CustomizerSettingsService } from '../../customizer-settings/customizer-settings.service';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

@Component({
    selector: 'app-header',
    imports: [MatButtonModule, MatMenuModule, NgClass],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {

    // isSidebarToggled
    isSidebarToggled = false;

    // isToggled
    isToggled = false;
    public userInfo: any;
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
        // console.log('User Info:', this.userInfo);
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
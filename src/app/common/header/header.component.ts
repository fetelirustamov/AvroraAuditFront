import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ToggleService } from './toggle.service';
import { NgClass, NgIf } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { UserProfileService } from '../../auth/user-profile.service';

@Component({
    selector: 'app-header',
    imports: [MatButtonModule, MatMenuModule, NgClass, NgIf],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {

    isSidebarToggled = false;

    isSticky = false;

    constructor(
        private toggleService: ToggleService,
        private authService: AuthService,
        private router: Router,
        public profile: UserProfileService,
    ) {
        this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
            this.isSidebarToggled = isSidebarToggled;
        });
        // Naviqasiyadan sonra açıq sidebar-ı bağla
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            if (this.isSidebarToggled) {
                this.toggleService.toggle();
            }
        });
    }

    // Burger Menu Toggle
    toggle() {
        this.toggleService.toggle();
    }

    // Header Sticky
    @HostListener('window:scroll')
    checkScroll() {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        this.isSticky = scrollPosition >= 50;
    }

    logout() {
        this.authService.logout();
    }

}

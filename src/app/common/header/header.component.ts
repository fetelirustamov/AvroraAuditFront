import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { ToggleService } from './toggle.service';
import { AuthService } from '../../auth/auth.service';
import { UserProfileService } from '../../auth/user-profile.service';

/** Sidebar bu enin altında üstə açılan paneldir (sidebar.component.scss ilə eyni) */
export const SIDEBAR_OVERLAY_QUERY = '(max-width: 1199.98px)';

@Component({
    selector: 'app-header',
    imports: [MatMenuModule, MatIconModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {

    isSidebarToggled = false;

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

    logout() {
        this.authService.logout();
    }
}

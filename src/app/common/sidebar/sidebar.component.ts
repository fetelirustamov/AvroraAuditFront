import { Component, inject } from '@angular/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToggleService } from '../header/toggle.service';
import { AuthService } from '../../auth/auth.service';
import { MenuService } from '../menu/menu.service';
import { uiPageRoutes } from '../../ui/ui-pages.routes';

@Component({
    selector: 'app-sidebar',
    imports: [NgScrollbarModule, MatExpansionModule, RouterLinkActive, RouterLink],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
    private readonly menuService = inject(MenuService);

    // Menyu route ağacından (data.menu) icazəyə görə qurulur — statik HTML yoxdur.
    readonly menu = this.menuService.build('', uiPageRoutes);

    isSidebarToggled = false;

    constructor(
        private toggleService: ToggleService,
        private authService: AuthService,
    ) {
        this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
            this.isSidebarToggled = isSidebarToggled;
        });
    }

    toggle() {
        this.toggleService.toggle();
    }

    logout() {
        this.authService.logout();
    }
}

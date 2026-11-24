import { Component, inject, signal } from '@angular/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { ToggleService } from '../header/toggle.service';
import { AuthService } from '../../auth/auth.service';
import { MenuService } from '../menu/menu.service';
import { uiRoutes } from '../../ui/ui.routes';

@Component({
    selector: 'app-sidebar',
    imports: [NgScrollbarModule, MatExpansionModule, RouterLinkActive, RouterLink, NgClass],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
    private readonly menuService = inject(MenuService);

    // Menyu route ağacından (data.menu) icazəyə görə qurulur — statik HTML yoxdur.
    readonly menu = this.menuService.build('', uiRoutes);

    // Mat Expansion
    readonly panelOpenState = signal(false);

    isSidebarToggled = false;

    constructor(
        private toggleService: ToggleService,
        private authService: AuthService,
    ) {
        this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
            this.isSidebarToggled = isSidebarToggled;
        });
    }

    // Burger Menu Toggle
    toggle() {
        this.toggleService.toggle();
    }

    logout() {
        this.authService.logout();
    }
}

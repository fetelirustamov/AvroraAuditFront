import { Component, inject, signal } from '@angular/core';
import { ToggleService } from '../../../common/header/toggle.service';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { MenuService } from '../../../common/menu/menu.service';
import { adminPageRoutes } from '../../admin-pages.routes';

@Component({
  selector: 'app-sidebar',
  imports: [NgScrollbarModule, MatExpansionModule, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly menuService = inject(MenuService);

  // Menyu route ağacından (data.menu) icazəyə görə qurulur — statik HTML yoxdur.
  readonly menu = this.menuService.build('/admin', adminPageRoutes);

  // Mat Expansion
  readonly panelOpenState = signal(false);

  isSidebarToggled = false;

  constructor(private toggleService: ToggleService) {
    this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
      this.isSidebarToggled = isSidebarToggled;
    });
  }

  // Burger Menu Toggle
  toggle() {
    this.toggleService.toggle();
  }
}

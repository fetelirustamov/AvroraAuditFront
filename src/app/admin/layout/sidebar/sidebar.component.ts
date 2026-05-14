import { Component, signal } from '@angular/core';
import { ToggleService } from '../../../common/header/toggle.service';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [NgScrollbarModule, MatExpansionModule, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  // isToggled
  isToggled = false;

  // Mat Expansion
  readonly panelOpenState = signal(false);

  // isSidebarToggled
  isSidebarToggled = false;

  constructor(
    private toggleService: ToggleService,
    public themeService: CustomizerSettingsService
  ) {
    this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
      this.isSidebarToggled = isSidebarToggled;
    });
    this.themeService.isToggled$.subscribe(isToggled => {
      this.isToggled = isToggled;
    });
  }

  // Burger Menu Toggle
  toggle() {
    this.toggleService.toggle();
  }
}

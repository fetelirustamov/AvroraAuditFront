import { Component } from '@angular/core';
import { CustomizerSettingsService } from '../customizer-settings/customizer-settings.service';
import { ToggleService } from '../common/header/toggle.service';
import { RouterOutlet } from '@angular/router';
import { CustomizerSettingsComponent } from '../customizer-settings/customizer-settings.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { NgClass, CommonModule } from '@angular/common';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, NgClass, CommonModule, HeaderComponent, SidebarComponent, FooterComponent, CustomizerSettingsComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  isSidebarToggled = false;

  // isToggled
  isToggled = false;

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

}

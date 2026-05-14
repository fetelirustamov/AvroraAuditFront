import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../common/sidebar/sidebar.component';
import { ToggleService } from '../common/header/toggle.service';
import { CustomizerSettingsService } from '../customizer-settings/customizer-settings.service';
import { NgClass } from '@angular/common';
import { HeaderComponent } from '../common/header/header.component';
import { FooterComponent } from '../common/footer/footer.component';
import { CustomizerSettingsComponent } from '../customizer-settings/customizer-settings.component';
import { HttpClientModule } from '@angular/common/http';

@Component({
    selector: 'app-ui',
    standalone: true,
    imports: [RouterOutlet, NgClass, HeaderComponent, SidebarComponent, FooterComponent, CustomizerSettingsComponent],
    templateUrl: './ui.component.html',
    styleUrl: './ui.component.scss'
})
export class UiComponent {
    // isSidebarToggled
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
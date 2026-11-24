import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../common/sidebar/sidebar.component';
import { ToggleService } from '../common/header/toggle.service';
import { NgClass } from '@angular/common';
import { HeaderComponent } from '../common/header/header.component';

@Component({
    selector: 'app-ui',
    standalone: true,
    imports: [RouterOutlet, NgClass, HeaderComponent, SidebarComponent],
    templateUrl: './ui.component.html',
    styleUrl: './ui.component.scss'
})
export class UiComponent {

    isSidebarToggled = false;

    constructor(private toggleService: ToggleService) {
        this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
            this.isSidebarToggled = isSidebarToggled;
        });
    }

}

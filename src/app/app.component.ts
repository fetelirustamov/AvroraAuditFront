import { Component } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { RouterOutlet, Router, Event, NavigationEnd } from '@angular/router';
import { SidebarSettingsComponent } from './sidebar-settings/sidebar-settings.component';

@Component({
    selector: 'app-root',
    // Əgər siz Standalone komponent istifadə edirsinizsə,
    // imports daxilində lazımi modulları qeyd edin.
    standalone: true,  // <-- Bu sətri əlavə edin
    imports: [RouterOutlet, CommonModule, SidebarSettingsComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']  // "styleUrls" düzgün açardır (nəzərə alın: "styleUrl" deyil)
})
export class AppComponent {
    title = 'Audit Sistemi';

    constructor(
        private router: Router,
        private viewportScroller: ViewportScroller
    ) {
        this.router.events.subscribe((event: Event) => {
            if (event instanceof NavigationEnd) {
                // Hər naviqasiya bitdikdən sonra səhifənin yuxarı hissəsinə keçid
                this.viewportScroller.scrollToPosition([0, 0]);
            }
        });
    }
}

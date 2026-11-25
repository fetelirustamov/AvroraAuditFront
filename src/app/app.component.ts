import { Component } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterOutlet, Router, Event, NavigationEnd } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'Audit sistemi';

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

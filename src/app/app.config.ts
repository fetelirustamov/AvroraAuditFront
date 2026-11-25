import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';

// Çərçivəyə aid provider-lər (paginator mətnləri və s.) core/shell-providers.ts-dədir
export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([AuthInterceptor])),
        provideAnimationsAsync(),
        // Tətbiqdə tək ikon dəsti: <mat-icon> da Material Symbols işlədir
        { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } }
    ]
};

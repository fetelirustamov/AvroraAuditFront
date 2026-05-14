import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { AzPaginatorIntl } from './core/az-paginator-intl.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([AuthInterceptor])),
        // withFetch() silindi - CORS problemləri üçün
        provideAnimationsAsync(),
        { provide: MatPaginatorIntl, useClass: AzPaginatorIntl }
    ]
};
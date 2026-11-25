import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeAz from '@angular/common/locales/az';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './auth/auth.interceptor';
import { AppTitleStrategy } from './core/app-title.strategy';

// İnterfeys dili azərbaycancadır: DatePipe/DecimalPipe ay adlarını və onluq vergülü buradan alır.
// Serverə gedən tarix/rəqəm stringləri locale-dən asılı olmamalıdır: ya rəqəmli pattern
// (`yyyy-MM-dd`), ya da açıq 'en-US' locale işlət (bax `shared/utils/date.util.ts`).
registerLocaleData(localeAz);

// Çərçivəyə aid provider-lər (paginator mətnləri və s.) core/shell-providers.ts-dədir
export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([AuthInterceptor])),
        provideAnimationsAsync(),
        { provide: LOCALE_ID, useValue: 'az' },
        // Brauzer tabı: "Səhifə · Audit" (route-un data.menu.title-ından)
        { provide: TitleStrategy, useClass: AppTitleStrategy },
        // Tətbiqdə tək ikon dəsti: <mat-icon> da Material Symbols işlədir
        { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } }
    ]
};

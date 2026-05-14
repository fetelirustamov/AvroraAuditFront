// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthInterceptor } from './app/auth/auth.interceptor';

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserAnimationsModule), 
        provideHttpClient(withInterceptors([AuthInterceptor])),
        // HTTP sorğuları üçün HttpClient və interceptor-ların qeydiyyatı
        // withFetch() silindi - CORS problemləri üçün
        // Router konfiqurasiyası
        provideRouter(routes)
    ]
}).catch(err => console.error(err));

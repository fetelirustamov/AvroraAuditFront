import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

/**
 * Standalone komponent spec-ləri üçün ortaq TestBed provider-ləri.
 * Komponentlərin əksəriyyəti servis (HttpClient) və route (ActivatedRoute) tələb edir;
 * hər spec-də təkrarlamaq əvəzinə burada bir yerdə saxlanılır.
 */
export const appTestProviders: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
];

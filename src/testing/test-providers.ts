import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SHELL_PROVIDERS } from '../app/core/shell-providers';

/**
 * Standalone komponent spec-ləri üçün ortaq TestBed provider-ləri.
 * Komponentlərin əksəriyyəti servis (HttpClient) və route (ActivatedRoute) tələb edir;
 * hər spec-də təkrarlamaq əvəzinə burada bir yerdə saxlanılır.
 * Səhifələr real tətbiqdə çərçivə route-unun provider-lərini (date adapter, paginator
 * mətnləri) alır, ona görə testdə də eyni SHELL_PROVIDERS verilir.
 */
export const appTestProviders: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
    ...SHELL_PROVIDERS,
];

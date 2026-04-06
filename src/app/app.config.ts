import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";
import { routes } from './app.routes';
import { SupabaseService } from './shared/service/supabase.service';

registerLocaleData(localeDe);

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
        provideHttpClient(withFetch()),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        provideTranslateService({
            fallbackLang: 'en',
            loader: provideTranslateHttpLoader({ prefix: "./assets/translations/", suffix: ".json" })
        }),
        provideAppInitializer(() =>
            inject(SupabaseService)
                .initializeAuthAndSync()
                .catch(err => {
                    console.error('Auth bootstrap failed, continuing app startup.', err);
                })
        ),
    ]
};

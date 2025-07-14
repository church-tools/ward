import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { routes } from './app.routes';

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, "./assets/translations/", ".json");
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withViewTransitions({
            skipInitialTransition: true,
            onViewTransitionCreated: ({ transition, from, to }) => {
                const fromRoute = from?.url
                // console.log('View transition created:', transition);
                // transition.skipTransition();
            }
        })),
        provideHttpClient(withFetch()),
        importProvidersFrom(TranslateModule.forRoot({
            defaultLanguage: "en",
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient],
            },
        })),
    ]
};

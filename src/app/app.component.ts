import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ServiceWorkerService } from './shared/service/service-worker.service';
import { trimPastedStrings } from './shared/utils/clipboard-utils';
import { SupabaseService } from './shared/service/supabase.service';

const LANGUAGE_STORAGE_KEY = 'language';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class AppComponent {

    public static supabase: SupabaseService | undefined;
    private readonly translate = inject(TranslateService);
    private readonly serviceWorkerService = inject(ServiceWorkerService);
    
    constructor() {
        const browserLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? this.translate.getBrowserLang()?.toLowerCase() ?? 'en';
        this.translate.use(browserLang);
        trimPastedStrings();
        AppComponent.supabase = inject(SupabaseService);
    }

    static saveLanguage(language: string) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
}

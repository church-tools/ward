import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ServiceWorkerService } from './shared/service/service-worker.service';
import { SupabaseService } from './shared/service/supabase.service';
import { PopoverService } from './shared/widget/popover/popover.service';

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
    private readonly popoverService = inject(PopoverService);
    
    constructor() {
        const browserLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? this.translate.getBrowserLang()?.toLowerCase() ?? 'en';
        this.translate.use(browserLang);
        AppComponent.supabase = inject(SupabaseService);

        this.serviceWorkerService.updateAvailable$.subscribe(() => {
            const ns = 'SERVICE_WORKER.UPDATE_AVAILABLE';
            this.popoverService
                .confirm(`${ns}.TITLE`, `${ns}.MESSAGE`, `${ns}.CONFIRM`, `${ns}.CANCEL`)
                .then(confirmed => (confirmed ? window.location.reload() : null));
        });

        this.serviceWorkerService.unrecoverable$.subscribe(() => {
            const ns = 'SERVICE_WORKER.ERROR_REFRESH';
            this.popoverService
                .confirm(`${ns}.TITLE`, `${ns}.MESSAGE`, `${ns}.CONFIRM`, `${ns}.CANCEL`)
                .then(confirmed => (confirmed ? window.location.reload() : null));
        });
    }

    static saveLanguage(language: string) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
}

import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { xcomputed } from '../utils/signal-utils';

export type SupportedLanguage = 'en' | 'de';

const LANGUAGE_STORAGE_KEY = 'language';

@Injectable({
    providedIn: 'root',
})
export class LanguageService {

    private readonly translate = inject(TranslateService);

    readonly current = toSignal(
        this.translate.onLangChange.pipe(map(({ lang }) => lang as SupportedLanguage)),
        { initialValue: (this.translate.getCurrentLang() || this.translate.getFallbackLang() || 'en') as SupportedLanguage },
    );

    readonly locale = xcomputed([this.current], lang => {
        if (lang.includes('-')) return lang;
        switch (lang as SupportedLanguage) {
            case 'de': return 'de-DE';
            case 'en': return 'en-US';
            default: throw new Error(`no locale for "${lang}"`);
        }
    });

    restoreFromStorage() {
        const browserLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? this.translate.getBrowserLang()?.toLowerCase() ?? 'en';
        this.translate.use(browserLang);
    }

    setLanguage(lang: string) {
        this.translate.use(lang);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
}
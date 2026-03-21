
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

export function mapLangToLocale(lang: string): string {
    if (lang.includes('-')) return lang;
    switch (lang) {
        case 'de': return 'de-DE';
        case 'en': return 'en-US';
    }
    throw new Error(`no locale for "${lang}"`);
}

function getCurrentLang(translate: TranslateService): string {
    return translate.getCurrentLang() || translate.getFallbackLang() || 'en';
}

export function createTranslateLocaleSignal(translate: TranslateService): Signal<string> {
    return toSignal(
        translate.onLangChange.pipe(
            map(({ lang }) => mapLangToLocale(lang || getCurrentLang(translate)))
        ),
        { initialValue: mapLangToLocale(getCurrentLang(translate)) }
    );
}

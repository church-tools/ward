import { Injectable, Signal, signal } from '@angular/core';
import { asyncComputed, xcomputed } from '../utils/signal-utils';
import type { Localization } from './localization.en';
import { interpolate, resolveLocalizationKey } from './localize-utils';

export const SUPPORTED_LANGUAGES = {
    en: 'English',
    de: 'Deutsch',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const LANGUAGE_STORAGE_KEY = 'language';

@Injectable({
    providedIn: 'root',
})
export class LanguageService {

    private readonly localizationPromisesByLanguage: Partial<Record<SupportedLanguage, Promise<Localization>>> = {};

    private readonly _current = signal<SupportedLanguage>('en');
    readonly current = this._current.asReadonly();

    readonly localization = asyncComputed([this._current], lang => this.getLocalization(lang));

    readonly locale = xcomputed([this._current], lang => {
        if (lang.includes('-')) return lang;
        switch (lang as SupportedLanguage) {
            case 'de': return 'de-DE';
            case 'en': return 'en-US';
            default: throw new Error(`no locale for "${lang}"`);
        }
    });

    readonly localizer = xcomputed([this.localization], localization => {
        if (!localization) return (key: string, params?: Record<string, unknown> | null) => key;
        return (key: string, params?: Record<string, unknown> | null) => {
            const translated = resolveLocalizationKey(localization, key) ?? key;
            return interpolate(translated, params);
        };
    });

    constructor() {
        let language = (localStorage.getItem(LANGUAGE_STORAGE_KEY) || navigator.language.split('-')[0]) as SupportedLanguage;
        if (!(language in SUPPORTED_LANGUAGES)) language = 'en';
        this._current.set(language);

    }

    setLanguage(lang: SupportedLanguage) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        this._current.set(lang);
    }

    async localize(key: string, params?: Record<string, unknown> | null): Promise<string> {
        const localization = await this.localization.asPromise();
		const translated = resolveLocalizationKey(localization, key) ?? key;
		return interpolate(translated, params);
    }

    localizeInstant(key: string, params?: Record<string, unknown> | null): string {
        const localization = this.localization();
        if (!localization) return key;
		const translated = resolveLocalizationKey(localization, key) ?? key;
		return interpolate(translated, params);
    }

    async getLocalizer(): Promise<(key: string, params?: Record<string, unknown> | null) => string> {
        const localization = await this.localization.asPromise();
        return (key: string, params?: Record<string, unknown> | null) => {
            const translated = resolveLocalizationKey(localization, key) ?? key;
            return interpolate(translated, params);
        };
    }

    stream(key: string, params?: Record<string, unknown> | null) {
        return xcomputed([this.localizer], localizer => localizer(key, params));
    }
    
    private async getLocalization(language: SupportedLanguage): Promise<Localization> {
        return this.localizationPromisesByLanguage[language] ??= (() => {
            switch (language) {
                case 'en': return import('./localization.en').then(m => m.LOCALIZATION);
                case 'de': return import('./localization.de').then(m => m.LOCALIZATION);
            }
        })();
    }
}
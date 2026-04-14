import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Component, inject } from '@angular/core';
import MenuButtonComponent from '../form/button/menu/menu-button';
import { LanguageService, SUPPORTED_LANGUAGES, SupportedLanguage } from '../language/language.service';

@Component({
    selector: 'app-language-select',
    template: `
        <app-menu-button class="left-aligned" type="subtle" icon="translate" iconSize="smaller">
            <div menu-content>
                @for (item of languageItems; track item.lang) {
                    <div class="left-aligned">
                        <button class="subtle" (click)="language.setLanguage(item.lang)"
                            [disabled]="language.current() === item.lang">
                            <img [src]="item.img" alt="{{ item.label }}"/>
                            {{ item.label }}
                        </button>
                    </div>
                }
            </div>
            <span button-text class="me-auto">{{ 'LANGUAGE' | localize }}</span>
        </app-menu-button>
    `,
    imports: [LocalizePipe, MenuButtonComponent],
    styles: [`
        img {
            width: 1.25rem;
            height: 1.25rem;
            object-fit: cover;
        }
    `],
})
export class LanguageSelect {

    protected readonly language = inject(LanguageService);

    protected readonly languageItems = Object.entries(SUPPORTED_LANGUAGES).map(([lang, label]) => ({
        lang: lang as SupportedLanguage,
        img: `assets/img/flags/${lang}.svg`,
        label,
    })).sort((a, b) => {
        if (a.label < b.label) return -1;
        if (a.label > b.label) return 1;
        return 0;
    });
}
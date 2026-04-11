import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import MenuButtonComponent from '../form/button/menu/menu-button';
import { LanguageService } from '../service/language.service';

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
            <span button-text class="me-auto">{{ 'LANGUAGE' | translate }}</span>
        </app-menu-button>
    `,
    imports: [TranslateModule, MenuButtonComponent],
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

    protected readonly languageItems = ['de', 'en'].map(lang => ({
        lang,
        img: `assets/img/flags/${lang}.svg`,
        label: (() => {
            switch (lang) {
                case 'de': return 'Deutsch';
                case 'en': return 'English';
                default: return lang;
            }
        })(),
    }));
}
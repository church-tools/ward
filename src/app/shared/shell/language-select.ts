import { Component, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppComponent } from '../../app.component';
import MenuButtonComponent from '../form/button/menu/menu-button';

@Component({
    selector: 'app-language-select',
    template: `
        <app-menu-button class="left-aligned" type="subtle" icon="translate" iconSize="smaller">
            <div menu-content>
                @for (item of languageItems; track item.lang) {
                    <div class="left-aligned">
                        <button class="subtle" (click)="setLanguage(item.lang)"
                            [disabled]="activeLanguage() === item.lang">
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
export class LanguageSelectComponent {

    private readonly translateService = inject(TranslateService);

    protected readonly activeLanguage = signal(this.translateService.getCurrentLang());

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

    protected setLanguage = (lang: string) => {
        this.translateService.use(lang);
        this.activeLanguage.set(lang);
        AppComponent.saveLanguage(lang);
    };
}
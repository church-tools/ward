import { AfterViewInit, Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppComponent } from '../../app.component';
import { ProfileService } from '../../modules/profile/profile.service';
import { MenuButtonActionItem } from '../form/button/menu/menu-button';
import { SupabaseService } from '../service/supabase.service';
import { WindowService } from '../service/window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused() || windowService.mobileOS',
        '[class.dense]': '!windowService.isLarge()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly profileService = inject(ProfileService);
    protected readonly windowService = inject(WindowService);
    protected readonly translateService = inject(TranslateService);
    protected readonly supabase = inject(SupabaseService);

    protected readonly languageItems: MenuButtonActionItem[] = ['de', 'en'].map(lang => ({
        img: `assets/img/flags/${lang}.svg`,
        label: (() => {
            switch (lang) {
                case 'de': return 'Deutsch';
                case 'en': return 'English';
                default: return lang;
            }
        })(),
        action: () => {
            this.translateService.use(lang);
            AppComponent.saveLanguage(lang);
        }
    }));

    constructor() {
        this.windowService.setTitleBarColor({
            focused: { light: '#cedad8', dark: '#172825' },
            unfocused: { light: '#e8e8e8', dark: '#272727' }
        });
    }

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }
    
}
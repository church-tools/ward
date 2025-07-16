import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProfileService } from '../../modules/profile/profile.service';
import { UnitService } from '../../modules/unit/unit.service';
import { AnimatedRouter } from '../../shared/decorator/animated-router';
import MenuButtonComponent, { MenuButtonActionItem, MenuButtonItem } from '../../shared/form/button/menu/menu-button';
import { ShellComponent } from '../../shared/shell/shell';
import { SupabaseService } from '../../shared/supabase.service';
import { xcomputed, xeffect } from '../../shared/utils/signal-utils';
import { privateTabs } from '../private.routes';
import { AdminService } from '../shared/admin.service';
import { NavBarComponent, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearchComponent } from './omni-search/omni-search';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [RouterOutlet, AnimatedRouter, TranslateModule, NavBarComponent, OmniSearchComponent, MenuButtonComponent],
})
export class PrivateShellComponent extends ShellComponent implements OnInit {

    private readonly translateService = inject(TranslateService);
    private readonly profileService = inject(ProfileService);
    private readonly adminService = inject(AdminService);

    protected readonly authenticated = signal<boolean>(false);
    protected readonly tabs = signal<NavBarTab[]>([]);
    protected readonly editMode = signal(false);
    private readonly supabaseService = inject(SupabaseService);
    private readonly unitService = inject(UnitService);
    private readonly router = inject(Router);

    protected readonly additionalItems = xcomputed([this.profileService.ownSignal], profile => {
        const items: MenuButtonItem[] = [];
        if (!profile) return items;
        if (profile.is_unit_admin) {
            items.push({
                labelTranslateId: 'ENABLE_EDIT_MODE',
                icon: 'edit',
                toggle: this.editMode,
            });
        }
        return items;
    });

    protected readonly languageItems: MenuButtonActionItem[] = ['de', 'en'].map(lang => ({
        img: `assets/img/flags/${lang}.svg`,
        label: (function() { switch (lang) {
            case 'de': return 'Deutsch';
            case 'en': return 'English';
            default: return lang;
        }})(),
        action: () => this.translateService.use(lang)
    }));

    constructor() {
        super();
        this.authenticate();
        xeffect([this.editMode], editMode => this.adminService.editMode.set(editMode));
    }
    
    async ngOnInit() {
        this.tabs.set(Object.entries(privateTabs).map(([path, { translateId, icon }]) =>
            <NavBarTab>{ path, translateId, icon }));
    }

    private async authenticate() {
        const session = await this.supabaseService.getSession();
        if (!session) {
            this.router.navigate(['/login']);
            return;
        }
        const unit = await this.unitService.getUnit();
        if (!unit) {
            this.router.navigate(['/setup']);
            return;
        }
        this.authenticated.set(true);
    }
}
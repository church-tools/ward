import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Session } from '@supabase/supabase-js';
import { ProfileService } from '../../modules/profile/profile.service';
import { UnitService } from '../../modules/unit/unit.service';
import MenuButtonComponent, { MenuButtonActionItem, MenuButtonItem } from '../../shared/form/button/menu/menu-button';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { SupabaseService } from '../../shared/service/supabase.service';
import { ShellComponent } from '../../shared/shell/shell';
import { blockInWeekToTime, HOUR } from '../../shared/utils/date-utils';
import { xcomputed, xeffect } from '../../shared/utils/signal-utils';
import { privateTabs } from '../private.routes';
import { AdminService } from '../shared/admin.service';
import { BackButtonComponent } from "./back-button/back-button";
import { NavBarComponent, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearchComponent } from './omni-search/omni-search';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [TranslateModule, NavBarComponent, OmniSearchComponent, MenuButtonComponent, PageRouterOutlet, BackButtonComponent],
})
export class PrivateShellComponent extends ShellComponent implements OnInit {

    private readonly translateService = inject(TranslateService);
    private readonly profileService = inject(ProfileService);
    private readonly adminService = inject(AdminService);

    protected readonly tabs = signal<NavBarTab[]>([]);
    protected readonly editMode = signal(false);
    private readonly supabase = inject(SupabaseService);
    private readonly unitService = inject(UnitService);
    private readonly router = inject(Router);

    protected readonly additionalItems = xcomputed([this.profileService.own], profile => {
        const items: MenuButtonItem[] = [];
        if (!profile) return items;
        items.push({
            labelTranslateId: 'SIGN_OUT',
            icon: 'sign_out',
            action: async () => {
                await this.supabase.signOut();
                this.router.navigate(['/login']);
            }
        });
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
        xeffect([this.editMode], editMode => this.adminService.editMode.set(editMode));
        this.authenticate()
        .then(async session => {
            if (!session || this.windowService.currentRoute() != '/') return;
            const startRoute = await this.getStartRoute(session);
            this.router.navigate([startRoute]);
        });
    }
    
    async ngOnInit() {
        this.tabs.set(Object.entries(privateTabs).map(([path, { translateId, icon }]) =>
            <NavBarTab>{ path, translateId, icon }));
    }

    private async authenticate() {
        const session = await this.supabase.getSession();
        if (!session) {
            this.router.navigate(['/login']);
            return;
        }
        const unit = await this.unitService.getUnit();
        if (!unit) {
            this.router.navigate(['/setup']);
            return;
        }
        return session;
    }

    private async getStartRoute(session: Session) {
        const token = this.supabase.getDataFromAccessToken(session.access_token);
        const [unit, agendas] = await Promise.all([
            this.supabase.sync.from('unit').read(token.unit).get(),
            this.supabase.sync.from('agenda').readAll().get(),
        ]);
        const now = Date.now();
        const sacramentServiceStart = blockInWeekToTime(unit!.sacrament_service_time).getTime();
        if (sacramentServiceStart <= now && now <= sacramentServiceStart + HOUR) {
            return '/churchService';
        }
        for (const agenda of agendas) {
            const startTime = blockInWeekToTime(agenda.start_time).getTime();
            if (startTime <= now && now <= startTime + HOUR) {
                return '/meetings/' + agenda.id;
            }
        }
        return '/members';
    }
}
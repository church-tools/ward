import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UnitService } from '../../modules/unit/unit.service';
import MenuButtonComponent, { MenuButtonItem } from '../../shared/form/button/menu/menu-button';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
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

    private readonly adminService = inject(AdminService);

    protected readonly tabs = signal<NavBarTab[]>([]);
    protected readonly editMode = signal(false);
    private readonly router = inject(Router);

    protected readonly menuItems = xcomputed([this.profileService.own], profile => {
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

    constructor() {
        super();
        xeffect([this.editMode], editMode => this.adminService.editMode.set(editMode));
        if (this.windowService.currentRoute() != '/') return;
        this.getStartRoute().then(startRoute => {
            this.router.navigate([startRoute]);
        })
    }
    
    async ngOnInit() {
        const session = await this.supabase.getSession();
        this.tabs.set(Object.entries(privateTabs)
            .filter(([_, { admin }]) => !admin || session?.is_admin)
            .map(([path, { translateId, icon }]) => ({ path, translateId, icon })));
    }

    private async getStartRoute() {
        const [unit, agendas] = await Promise.all([
            (inject(UnitService)).getUnit(),
            this.supabase.sync.from('agenda').readAll().get(),
        ]);
        const now = Date.now();
        const sacramentServiceStart = blockInWeekToTime(unit!.sacrament_service_time).getTime();
        if (sacramentServiceStart <= now && now <= sacramentServiceStart + HOUR) {
            return '/church-service';
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
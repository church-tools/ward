import { OrganizationService } from '@/modules/organization/organization.service';
import { UnitService } from '@/modules/unit/unit.service';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import MenuButtonComponent from '@/shared/form/button/menu/menu-button';
import Switch from '@/shared/form/switch/switch';
import { Icon } from "@/shared/icon/icon";
import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PageRouterOutlet } from "../../shared/page/page-router-outlet";
import { LanguageSelect } from "../../shared/shell/language-select";
import { Shell } from '../../shared/shell/shell';
import { blockInWeekToTime, HOUR } from '../../shared/utils/date-utils';
import { privateTabs } from '../private.routes';
import { AdminService } from '../shared/admin.service';
import { BackButton } from "./back-button/back-button";
import { NavBar, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearch } from './omni-search/omni-search';
import { Presences } from "./presences";

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [TranslateModule, NavBar, OmniSearch, MenuButtonComponent,
        PageRouterOutlet, BackButton, AsyncButton, Presences,
        Icon, Switch, LanguageSelect],
})
export class PrivateShell extends Shell implements OnInit {

    protected readonly adminService = inject(AdminService);
    private readonly unitService = inject(UnitService);
    private readonly organizationService = inject(OrganizationService);

    protected readonly tabs = signal<NavBarTab[]>([]);

    constructor() {
        super();
        if (this.windowService.currentRoute() != '/') return;
        this.getStartRoute().then(startRoute => {
            this.router.navigate([startRoute]);
        })
    }
    
    async ngOnInit() {
        const session = await this.supabase.getSession();
        const isUnitAdmin = this.adminService.isUnitAdmin();
        this.tabs.set(Object.entries(privateTabs)
            .filter(([_, { admin }]) => !admin || session?.is_admin || isUnitAdmin)
            .map(([path, { translateId, icon, onBottom }]) => ({ path, translateId, icon, bottom: onBottom })));
    }

    private async getStartRoute() {
        const [unit, agendas] = await Promise.all([
            this.unitService.getUnit(),
            
            this.organizationService.own.asPromise()
            .then(organizations => 
                this.supabase.sync.from('agenda').find()
                .eq('weekday', new Date().getDay())
                .containsAny('organizations', organizations.map(o => o.id))
                .get()
            )
        ]);
        const now = Date.now();
        const sacramentServiceStart = blockInWeekToTime(unit!.sacrament_service_time).getTime();
        if (sacramentServiceStart <= now && now <= sacramentServiceStart + HOUR)
            return '/church-service';
        for (const agenda of agendas) {
            const startTime = blockInWeekToTime(agenda.start_time).getTime();
            if (startTime <= now && now <= startTime + HOUR) {
                return '/meetings/agenda/' + agenda.id;
            }
        }
        return '/meetings';
    }
}
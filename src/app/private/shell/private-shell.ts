import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ProfileService } from '../../modules/profile/profile.service';
import { UnitService } from '../../modules/unit/unit.service';
import MenuButtonComponent, { MenuButtonItem } from '../../shared/form/button/menu/menu-button';
import { ShellComponent } from '../../shared/shell/shell';
import { SupabaseService } from '../../shared/supabase.service';
import { xcomputed, xeffect } from '../../shared/utils/signal-utils';
import { privateTabs } from '../private.routes';
import { PrivatePageComponent } from '../shared/private-page';
import { NavBarComponent, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearchComponent } from './omni-search/omni-search';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [RouterOutlet, NavBarComponent, OmniSearchComponent, MenuButtonComponent],
})
export class PrivateShellComponent extends ShellComponent implements OnInit {

    private readonly profileService = inject(ProfileService);

    private readonly routerOutlet = viewChild.required(RouterOutlet);

    protected readonly authenticated = signal<boolean>(false);
    protected readonly tabs = signal<NavBarTab[]>([]);
    protected readonly editMode = signal(false);
    private readonly supabaseService = inject(SupabaseService);
    private readonly unitService = inject(UnitService);
    private readonly router = inject(Router);

    private readonly profile = this.profileService.getOwnAsSignal();
    protected readonly additionalItems = xcomputed([this.profile], profile => {
        const items: MenuButtonItem[] = [];
        if (!profile) return items;
        if (profile.is_unit_admin) {
            items.push({
                label: 'Bearbeiten',
                icon: 'edit',
                toggle: this.editMode,
            });
        }
        return items;
    });

    constructor() {
        super();
        this.authenticate();
        xeffect([this.routerOutlet, this.editMode], (outlet, editMode) => {
            if (!outlet?.isActivated) return;
            (outlet.component as PrivatePageComponent | undefined)?.editMode.set(editMode ?? false);
        });
    }
    
    async ngOnInit() {
        this.tabs.set(Object.entries(privateTabs).map(([path, { label, icon }]) =>
            <NavBarTab>{ path, label, icon }));
    }

    protected onOutletLoaded(pageComponent: PrivatePageComponent) {
        pageComponent.editMode.set(this.editMode());
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
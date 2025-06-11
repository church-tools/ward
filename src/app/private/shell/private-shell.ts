import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { UnitService } from '../../modules/unit/unit.service';
import { ShellComponent } from '../../shared/shell/shell';
import { SupabaseService } from '../../shared/supabase.service';
import { privateTabs } from '../private.routes';
import { NavBarComponent, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearchComponent } from './omni-search/omni-search';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [RouterOutlet, NavBarComponent, OmniSearchComponent],
})
export class PrivateShellComponent extends ShellComponent implements OnInit {

    protected readonly authenticated = signal<boolean>(false);
    protected readonly tabs = signal<NavBarTab[]>([]);

    private readonly supabaseService = inject(SupabaseService);
    private readonly unitService = inject(UnitService);
    private readonly router = inject(Router);

    constructor() {
        super();
        this.authenticate();
    }

    async ngOnInit() {
        this.tabs.set(privateTabs.map(({ path, label, icon }) =>
            <NavBarTab>{ path, label, icon }));
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
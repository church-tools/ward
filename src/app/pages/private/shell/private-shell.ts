import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ShellComponent } from '../../../shared/shell/shell';
import { SupabaseService } from '../../../shared/supabase.service';
import { NavBarComponent, NavBarTab } from './nav-bar/nav-bar';
import { OmniSearchComponent } from './omni-search/omni-search';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrls: ['../../../shared/shell/shell.scss', './private-shell.scss'],
    imports: [RouterOutlet, NavBarComponent, OmniSearchComponent],
})
export class PrivateShellComponent extends ShellComponent implements OnInit {

    protected readonly authenticated = signal<boolean>(false);
    protected readonly tabs = signal<NavBarTab[]>([]);

    private readonly supabaseService = inject(SupabaseService);
    private readonly router = inject(Router);

    constructor() {
        super();
        this.authenticate()
        .then(authenticated => this.authenticated.set(authenticated));
    }

    ngOnInit() {
        this.tabs.set([
            { path: 'data', label: 'Daten', icon: 'database' },
            { path: 'tab1', label: 'Tab 1', icon: 'access_time' },
            { path: 'tab2', label: 'Tab 2', icon: 'add_subtract_circle' },
            { path: 'tab3', label: 'Tab 3', icon: 'alert' },
        ]);
    }

    private async authenticate(): Promise<boolean> {
        const session = await this.supabaseService.getSession();
        if (session) return true;
        // If no session, redirect to login
        this.router.navigate(['/login']);
        return false;
    }
}
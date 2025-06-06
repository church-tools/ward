import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../../shared/supabase.service';
import WindowService from '../../../shared/window.service';
import { NavBarComponent, NavTab } from './nav-bar/nav-bar';

@Component({
    selector: 'app-private-shell',
    templateUrl: './private-shell.html',
    styleUrl: './private-shell.scss',
    imports: [RouterOutlet, NavBarComponent],
    host: {
        '[class.focused]': 'windowService.focused()',
    }
})
export class PrivateShellComponent implements OnInit {

    protected readonly authenticated = signal<boolean>(false);
    protected readonly tabs = signal<NavTab[]>([]);

    protected readonly windowService = inject(WindowService);
    private readonly supabaseService = inject(SupabaseService);
    private readonly router = inject(Router);

    constructor() {
        this.authenticate()
        .then(authenticated => this.authenticated.set(authenticated));
    }

    ngOnInit() {
        this.tabs.set([
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
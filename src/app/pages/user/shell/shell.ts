import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import WindowService from '../../../shared/window.service';
import { NavBarComponent, NavTab } from './nav-bar/nav-bar';

@Component({
    selector: 'app-shell',
    templateUrl: './shell.html',
    styleUrl: './shell.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, NavBarComponent],
})
export class ShellComponent implements OnInit {

    protected readonly tabs = signal<NavTab[]>([]);

    protected readonly windowService = inject(WindowService);

    constructor() { }

    ngOnInit() {
        this.tabs.set([
            { path: 'tab1', label: 'Tab 1', icon: 'access_time' },
            { path: 'tab2', label: 'Tab 2', icon: 'add_subtract_circle' },
            { path: 'tab3', label: 'Tab 3', icon: 'alert' },
        ]);
    }
}
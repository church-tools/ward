import { Component, input, OnDestroy, signal } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Subscription } from "rxjs";
import { xeffect } from "../../../shared/utils/signal-utils";


@Component({
    selector: 'app-drawer',
    template: `
        <div class="main row center-content">
            <ng-content select="[main]"/>
        </div>
        <div class="drawer card canvas-card">
            <div class="drawer-body">
                <ng-content select="[drawer]"/>
            </div>
        </div>
    `,
    styleUrl: './drawer.scss',
    host: {
        '[class.open]': 'isOpen()'
    }
})
export class DrawerComponent implements OnDestroy {

    readonly routerOutlet = input.required<RouterOutlet>();
    
    protected readonly isOpen = signal(false);

    private routerSubscriptions: Subscription[] = [];

    constructor() {
        xeffect([this.routerOutlet], outlet => {
            this.isOpen.set(outlet.isActivated);
            this.routerSubscriptions.forEach(sub => sub.unsubscribe());
            this.routerSubscriptions = [
                outlet.activateEvents.subscribe(() => this.isOpen.set(true)),
                outlet.deactivateEvents.subscribe(() => this.isOpen.set(false))
            ];
        });
    }

    ngOnDestroy() {
        this.routerSubscriptions.forEach(sub => sub.unsubscribe());
    }
}
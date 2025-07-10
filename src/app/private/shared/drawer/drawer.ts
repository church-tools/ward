import { Component, ElementRef, input, OnDestroy, output, Signal, signal, viewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Subscription } from "rxjs";
import ButtonComponent from "../../../shared/form/button/button";
import { transitionStyle } from "../../../shared/utils/dom-utils";
import { xeffect } from "../../../shared/utils/signal-utils";
import { easeOut } from "../../../shared/utils/style";


@Component({
    selector: 'app-drawer',
    template: `
        <div class="main row center-content">
            <ng-content select="[main]"/>
        </div>
        @if (isOpen()) {
            <div #drawer class="drawer">
                <div class="drawer-card card canvas-card">
                    <div class="drawer-body">
                        <ng-content select="[drawer]"/>
                    </div>
                    <app-button type="subtle" icon="dismiss" size="large"
                        class="close-button icon-only"
                        (click)="close()"/>
                </div>
            </div>
        }
    `,
    imports: [ButtonComponent],
    styleUrl: './drawer.scss',
})
export class DrawerComponent implements OnDestroy {

    readonly routerOutlet = input.required<RouterOutlet>();
    readonly onClose = output<void>();
    
    protected readonly isOpen = signal(false);

    private readonly drawerView = viewChild('drawer', { read: ElementRef }) as Signal<ElementRef<HTMLElement>>;

    private routerSubscriptions: Subscription[] = [];

    constructor() {
        xeffect([this.routerOutlet], outlet => {
            this.isOpen.set(outlet.isActivated);
            this.routerSubscriptions.forEach(sub => sub.unsubscribe());
            this.routerSubscriptions = [
                outlet.activateEvents.subscribe(this.open.bind(this)),
                outlet.deactivateEvents.subscribe(this.close.bind(this)),
            ];
        });
        xeffect([this.drawerView], async drawer => {
            if (!drawer) return;
            const element = drawer.nativeElement;
            const width = element.offsetWidth;
            const margin = (element.computedStyleMap().get('margin-left') as CSSUnitValue).value;
            await transitionStyle(element,
                { maxWidth: '0px', marginLeft: '0px' },
                { maxWidth: `${width}px`, marginLeft: `${margin}` },
                500, easeOut);
            element.style.maxWidth = '';
            element.style.marginLeft = `${margin}px`;
        });
    }

    private async open() {
        this.isOpen.set(true);
    }

    protected async close() {
        const element = this.drawerView()!.nativeElement;
        const width = element.offsetWidth;
        const margin = (element.computedStyleMap().get('margin-left') as CSSUnitValue).value;
        await transitionStyle(element,
            { maxWidth: `${width}px`, marginLeft: `${margin}` },
            { maxWidth: '0px', marginLeft: '0px' },
            500, easeOut, true);
        this.isOpen.set(false);
        this.onClose.emit();
    }

    ngOnDestroy() {
        this.routerSubscriptions.forEach(sub => sub.unsubscribe());
    }
}
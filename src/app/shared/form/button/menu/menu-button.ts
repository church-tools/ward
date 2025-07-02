import { Component, ElementRef, inject, input, InputSignal, OnDestroy, signal, WritableSignal } from "@angular/core";
import { Icon, IconComponent } from "../../../icon/icon";
import { xcomputed } from "../../../utils/signal-utils";
import SwitchComponent from "../../switch/switch";
import ButtonBaseComponent from "../shared/button-base";
import { FormsModule } from "@angular/forms";

export type MenuPosition = 'top' | 'bottom';
export type MenuAlignment = 'left' | 'right';
export type MenuButtonItemBase = { label: string; icon?: Icon; }
export type MenuButtonLinkItem = MenuButtonItemBase & { link: string; };
export type MenuButtonActionItem = MenuButtonItemBase & { action: () => void; };
export type MenuButtonToggleItem = MenuButtonItemBase & { toggle: WritableSignal<boolean>; };
export type MenuButtonItem = MenuButtonLinkItem | MenuButtonActionItem | MenuButtonToggleItem;

@Component({
    selector: 'app-menu-button',
    imports: [FormsModule, IconComponent, SwitchComponent],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}" [class]="classes()">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
            <ng-content/>
        </button>
        @if (visible() || fading()) {
            <div class="menu-popup acrylic-card" [class.fading]="fading()" [style]="style()">
                @for (item of items(); track item) {
                    @if ('link' in item) {
                        <a class="menu-item" [href]="item.link">
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            {{ item.label }}
                        </a>
                    } @else if ('action' in item) {
                        <button class="menu-item" (click)="item.action()">
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            {{ item.label }}
                        </button>
                    } @else if ('toggle' in item) {
                        <div class="menu-item">
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            <app-switch [(ngModel)]="item.toggle" class="menu-item" [label]="item.label" 
                                [forceLabelOnSide]="true" labelSide="left"/>
                        </div>
                    }
                }
            </div>
        }
    `,
    styleUrl: './menu-button.scss',
})
export default class MenuButtonComponent extends ButtonBaseComponent implements OnDestroy {

    private readonly elementRef = inject(ElementRef);

    override readonly icon = input(<any>'more_vertical');
    readonly items = input.required<MenuButtonItem[]>();
    readonly position = input<MenuPosition>('bottom');
    readonly alignment = input<MenuAlignment>('right');
    
    protected readonly visible = signal(false);
    protected readonly fading = signal(false);
    protected readonly style = xcomputed([this.position, this.alignment], (position, alignment) => {
        let style: Partial<CSSStyleDeclaration> = {};
        switch (position) {
            case 'top': style.bottom = '100%'; break;
            case 'bottom': style.top = '100%'; break;
        }
        switch (alignment) {
            case 'left': style.right = '0'; break;
            case 'right': style.left = '0'; break;
        }
        return style;
    });

    private shouldBeVisible = 0;
    private timeout: NodeJS.Timeout | undefined;

    execute() {
        this.toggle();
    }

    protected toggle() {
        this.setVisibility(!this.visible());
        const elem: HTMLElement = this.elementRef.nativeElement;
        if (this.visible()) {
            elem.addEventListener('mouseenter', () => this.setVisibilityFromMouse(true));
            elem.addEventListener('mouseleave', () => this.setVisibilityFromMouse(false));
        } else {
            elem.removeEventListener('mouseenter', () => this.setVisibilityFromMouse(true));
            elem.removeEventListener('mouseleave', () => this.setVisibilityFromMouse(false));
        }
    }

    protected click(event: UIEvent) {
        event.preventDefault();
        if (!this.isRealClick()) return;
        this.toggle();
    }

    private setVisibilityFromMouse(show: boolean) {
        this.shouldBeVisible += show ? 1 : -1;
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.setVisibility(this.shouldBeVisible > 0), 500);
    }

    private setVisibility(visible: boolean) {
        if (this.visible() === visible) return;
        this.visible.set(visible);
        this.fading.set(!visible);
        if (this.fading())
            setTimeout(() => this.fading.set(false), 100);
    }
}
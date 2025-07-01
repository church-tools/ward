import { Component, input, InputSignal, OnDestroy, signal } from "@angular/core";
import { Icon, IconComponent } from "../../../icon/icon";
import ButtonBaseComponent from "../shared/button-base";

export type MenuButtonItemBase = { label: string; icon?: Icon; }
export type MenuButtonLinkItem = MenuButtonItemBase & { link: string; };
export type MenuButtonActionItem = MenuButtonItemBase & { action: () => void; };
export type MenuButtonToggleItem = MenuButtonItemBase & { toggle: (enabled: boolean) => void; };
export type MenuButtonItem = MenuButtonLinkItem | MenuButtonActionItem | MenuButtonToggleItem;

@Component({
    selector: 'app-menu-button',
    imports: [IconComponent],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}" [class]="classes()">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
            <ng-content/>
        </button>
        @if (visible() || fading()) {
            <div class="menu-popup acrylic-card" [class.fading]="fading()">
                @for (item of items(); track item) {
                    @if ('link' in item) {
                        <a class="menu-item" [href]="item.link">
                            @if (item.icon) { <app-icon [icon]="item.icon" [filled]="true"/> }
                            {{ item.label }}
                        </a>
                    } @else if ('action' in item) {
                        <button class="menu-item" (click)="item.action()">
                            @if (item.icon) { <app-icon [icon]="item.icon" [filled]="true"/> }
                            {{ item.label }}
                        </button>
                    } @else if ('toggle' in item) {
                        <button class="menu-item" (click)="item.toggle(!visible())">
                            @if (item.icon) { <app-icon [icon]="item.icon" [filled]="true"/> }
                            {{ item.label }}
                        </button>
                    }
                }
            </div>
        }
    `,
})
export default class MenuButtonComponent extends ButtonBaseComponent implements OnDestroy {

    override readonly icon: InputSignal<Icon> = input(<any>'more_vertical');
    readonly items = input.required<MenuButtonItem[]>();
    
    protected readonly visible = signal(false);
    protected readonly fading = signal(false);

    protected toggle() {
        this.visible.update(v => !v);
        if (this.visible()) {
            this.fading.set(false);
        } else {
            this.fading.set(true);
            setTimeout(() => this.fading.set(false), 100);
        }
    }

    protected click(event: UIEvent) {
        this.toggle();
        event.preventDefault();
    }

    execute() {
        this.toggle();
    }
}
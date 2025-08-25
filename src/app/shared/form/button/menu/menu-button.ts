import { Component, ElementRef, inject, input, OnDestroy, signal, WritableSignal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { Icon, IconComponent, IconPath } from "../../../icon/icon";
import { xcomputed } from "../../../utils/signal-utils";
import SwitchComponent from "../../switch/switch";
import ButtonBaseComponent from "../shared/button-base";

export type MenuPosition = 'top' | 'bottom';
export type MenuAlignment = 'left' | 'right';
export type MenuButtonItemBase = { label?: string, labelTranslateId?: string; icon?: Icon | IconPath; img?: string }
export type MenuButtonLinkItem = MenuButtonItemBase & { link: string; };
export type MenuButtonActionItem = MenuButtonItemBase & { action: () => void; };
export type MenuButtonToggleItem = MenuButtonItemBase & { toggle: WritableSignal<boolean>; };
export type MenuButtonItem = MenuButtonLinkItem | MenuButtonActionItem | MenuButtonToggleItem;

@Component({
    selector: 'app-menu-button',
    imports: [FormsModule, TranslateModule, IconComponent, SwitchComponent],
    template: `
        <button (click)="click($event)" [disabled]="disabled()" title="{{title()}}" [class]="classes()">
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="iconFilled()"/> }
            <ng-content select="[button-text]"/>
        </button>
        @if (visible()) {
            <div class="menu-popup acrylic-card" animate.leave="leave" [style]="style()">
                @for (item of items(); track item) {
                    @if ('link' in item) {
                        <a class="menu-item" [href]="item.link">
                            @if (item.img) { <img [src]="item.img" alt="{{item.labelTranslateId}}"/> }
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            {{ item.label || (item.labelTranslateId! | translate) }}
                        </a>
                    } @else if ('action' in item) {
                        <button class="menu-item subtle" (click)="item.action()">
                            @if (item.img) { <img [src]="item.img" alt="{{item.labelTranslateId}}" class="menu-img"/> }
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            {{ item.label || (item.labelTranslateId! | translate) }}
                        </button>
                    } @else if ('toggle' in item) {
                        <div class="menu-item">
                            @if (item.img) { <img [src]="item.img" alt="{{item.labelTranslateId}}"/> }
                            @if (item.icon) { <app-icon [icon]="item.icon" size="smaller"/> }
                            <app-switch [(ngModel)]="item.toggle" class="menu-item" label="{{ item.label || (item.labelTranslateId! | translate) }}" 
                                [forceLabelOnSide]="true" labelSide="left"/>
                        </div>
                    }
                }
                <ng-content select="[menu-content]"/>
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
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.setVisibility(!this.visible());
        if (this.visible()) {
            const elem: HTMLElement = this.elementRef.nativeElement;
            elem.addEventListener('mouseenter', this.setVisibilityFromMouse.bind(this, true));
            elem.addEventListener('mouseleave', this.setVisibilityFromMouse.bind(this, false));
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
        if (!visible) {
            const elem: HTMLElement = this.elementRef.nativeElement;
            elem.removeEventListener('mouseenter', this.setVisibilityFromMouse.bind(this, true));
            elem.removeEventListener('mouseleave', this.setVisibilityFromMouse.bind(this, false));
        }
    }
}
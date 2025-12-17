import { Component, DOCUMENT, ElementRef, inject, input, OnDestroy, signal, WritableSignal } from "@angular/core";
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
    imports: [TranslateModule, IconComponent, SwitchComponent],
    templateUrl: './menu-button.html',
    styleUrl: './menu-button.scss',
})
export default class MenuButtonComponent extends ButtonBaseComponent implements OnDestroy {

    private readonly elementRef = inject(ElementRef);
    private readonly document = inject<Document>(DOCUMENT);

    override readonly icon = input(<any>'more_vertical');
    readonly items = input.required<MenuButtonItem[]>();
    readonly position = input<MenuPosition>('bottom');
    readonly alignment = input<MenuAlignment>('right');
    readonly leaveTimeout = input<number>(2000);
    
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

    private timeout: ReturnType<typeof setTimeout> | undefined;

    private readonly onDocumentPointerDown = (event: PointerEvent) => {
        if (!this.visible()) return;
        const host: HTMLElement = this.elementRef.nativeElement;
        const target = event.target as Node | null;
        if (target && host.contains(target)) return;
        this.setVisibility(false);
    };

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.clearTimeout();
        this.removeEventListeners();
    }

    execute() {
        this.toggle();
    }

    protected toggle() {
        this.clearTimeout();
        this.setVisibility(!this.visible());
        if (this.visible()) {
            const elem: HTMLElement = this.elementRef.nativeElement;
            elem.addEventListener('mouseenter', this.show);
            elem.addEventListener('mouseleave', this.hide);
        }
    }

    protected click(event: UIEvent) {
        event.preventDefault();
        if (!this.isRealClick()) return;
        this.toggle();
    }

    private show = () => {
        this.clearTimeout();
        this.setVisibility(true);
    };

    private hide = () => {
        this.clearTimeout();
        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.setVisibility(false);
        }, this.leaveTimeout());
    };

    private setVisibility(visible: boolean) {
        if (this.visible() === visible) return;
        this.clearTimeout();
        this.visible.set(visible);
        if (!visible) {
            this.removeEventListeners();
        } else {
            this.document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
        }
    }

    private removeEventListeners() {   
        const elem: HTMLElement = this.elementRef.nativeElement;
        elem.removeEventListener('mouseenter', this.show);
        elem.removeEventListener('mouseleave', this.hide);
        this.document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    }

    private clearTimeout() {
        if (!this.timeout) return;
        clearTimeout(this.timeout);
        this.timeout = undefined;
    }
}
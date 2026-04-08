import { booleanAttribute, Component, ElementRef, inject, input, OnDestroy, viewChild } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { Icon } from "../../../icon/icon";
import { AnchoredPopover, PopoverAlignment, PopoverPosition } from "../../anchored-popover/anchored-popover";
import ButtonBase from "../shared/button-base";

@Component({
    selector: 'app-menu-button',
    imports: [TranslateModule, Icon, AnchoredPopover],
    templateUrl: './menu-button.html',
    styleUrl: './menu-button.scss',
    host: {
        '[style.anchor-name]': 'popover().anchorNameCss',
    },
})
export default class MenuButton extends ButtonBase implements OnDestroy {

    private readonly elementRef = inject(ElementRef);
    protected readonly popover = viewChild.required(AnchoredPopover);
    protected readonly hostElement: HTMLElement = this.elementRef.nativeElement;

    override readonly icon = input(<any>'more_vertical');
    readonly mainAction = input<(() => void) | null>(null);
    readonly position = input<PopoverPosition>('bottom');
    readonly alignment = input<PopoverAlignment>('right');
    readonly leaveTimeout = input<number>(0);
    readonly showChevron = input<boolean, unknown>(false, { transform: booleanAttribute });

    private timeout: ReturnType<typeof setTimeout> | undefined;

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.clearTimeout();
        this.removeEventListeners();
    }

    execute() {
        const action = this.mainAction();
        if (action) {
            action();
            return;
        }
        this.toggle();
    }

    protected toggle() {
        this.clearTimeout();
        this.popover().toggle();
        if (this.popover().visible) {
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

    protected mainClick(event: UIEvent) {
        event.preventDefault();
        if (!this.isRealClick()) return;
        this.mainAction()?.();
    }

    private show = () => {
        this.clearTimeout();
        this.popover().show();
    };

    private hide = () => {
        const timeout = this.leaveTimeout();
        if (!timeout) return;
        this.clearTimeout();
        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.popover().hide();
        }, this.leaveTimeout());
    };

    protected onVisibilityChange(visible: boolean) {
        if (!visible) this.removeEventListeners();
    }

    private removeEventListeners() {   
        const elem: HTMLElement = this.elementRef.nativeElement;
        elem.removeEventListener('mouseenter', this.show);
        elem.removeEventListener('mouseleave', this.hide);
    }

    private clearTimeout() {
        if (!this.timeout) return;
        clearTimeout(this.timeout);
        this.timeout = undefined;
    }
}
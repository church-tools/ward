import { Component, OnDestroy, effect, inject, input, signal } from "@angular/core";
import { Subscription } from "rxjs";
import { Icon, IconPath, IconSize } from "../../icon/icon";
import { ColorName } from "../../utils/color-utitls";
import WindowService from "../../window.service";

export type ButtonType = 'primary' | 'secondary' | 'subtle' | 'transparent' | 'form';
export type ButtonSize = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

@Component({
    template: '',
    host: {
        "[class]": "`${_type() ?? type()}-btn ${size()}-btn ${color()}-btn`",
        "[class.highlight-btn]": "highlight()",
        "[class.disabled]": "disabled()",
        "[class.icon-colored]": "iconColored()",
    },
    standalone: false
})
export default abstract class ButtonBaseComponent implements OnDestroy {

    readonly icon = input<Icon | IconPath>();
    readonly iconSize = input<IconSize>('smaller');
    readonly iconFilled = input(false);
    readonly iconColored = input(false);
    readonly title = input<string>();
    readonly type = input<ButtonType>('primary');
    readonly color = input<ColorName, ColorName>('accent', { transform: c => c ?? 'accent' });
    readonly highlight = input(false);
    readonly size = input<ButtonSize>('medium');
    readonly disabled = input(false);
    readonly shortcut = input<string | null>(null);
    
    protected readonly _type = signal<ButtonType | null>(null);
    
    private readonly windowService = inject(WindowService);
    private hotkeySubscription: Subscription | undefined;

    constructor() {
        effect(() => {
            const shortcut = this.shortcut();
            if (!shortcut) {
                this.hotkeySubscription?.unsubscribe();
                return;
            }
            this.hotkeySubscription = this.windowService.onCtrlAndKeyPressed(shortcut)
                .subscribe(this.execute.bind(this));
        });
    }

    ngOnDestroy() {
        this.hotkeySubscription?.unsubscribe();
    }

    abstract execute(): void;
}
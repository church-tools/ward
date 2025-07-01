import { Component, InputSignal, OnDestroy, inject, input, signal } from "@angular/core";
import { Subscription } from "rxjs";
import { Icon, IconSize } from "../../../icon/icon";
import { ColorName } from "../../../utils/color-utitls";
import { xcomputed, xeffect } from "../../../utils/signal-utils";
import WindowService from "../../../window.service";

export type ButtonType = 'primary' | 'secondary' | 'subtle' | 'transparent' | 'form';
export type ButtonSize = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

@Component({
    template: '',
})
export default abstract class ButtonBaseComponent implements OnDestroy {

    readonly icon = input<Icon>() as InputSignal<Icon>;
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
    readonly shortcutNeedsCtrl = input(true);
    
    protected readonly _type = signal<ButtonType | null>(null);
    protected readonly classes = xcomputed([this._type, this.type, this.size, this.color, this.disabled, this.iconColored],
        (_type, type, size, color, disabled, iconColored) =>
            `${_type ?? type} ${size} ${color}-btn ${disabled ? 'disabled' : ''} ${iconColored ? 'icon-colored' : ''}`);
    
    protected readonly windowService = inject(WindowService);
    private hotkeySubscription: Subscription | undefined;

    constructor() {
        xeffect([this.shortcut, this.shortcutNeedsCtrl], (shortcut, shortcutNeedsCtrl) => {
            this.hotkeySubscription?.unsubscribe();
            if (!shortcut) return;
            this.hotkeySubscription = (shortcutNeedsCtrl
                ? this.windowService.onCtrlAndKeyPressed(shortcut)
                : this.windowService.onKeyPressed(shortcut))
                    .subscribe(this.execute.bind(this));
        });
    }

    ngOnDestroy() {
        this.hotkeySubscription?.unsubscribe();
    }

    abstract execute(): void;
}
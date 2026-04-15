import { Component, OnDestroy, booleanAttribute, DOCUMENT, inject, input } from "@angular/core";
import { Subscription } from "rxjs";
import { IconCode, IconSize } from "@/shared/icon/icon";
import { WindowService } from "@/shared/service/window.service";
import { ColorName } from "@/shared/utils/color-utils";
import { getHoverNudge } from "@/shared/utils/hover-nudge";
import { xcomputed, xeffect } from "@/shared/utils/signal-utils";

export type ButtonType = 'primary' | 'secondary' | 'subtle' | 'transparent' | 'form';
export type ButtonSize = 'tiny' | 'small' | 'medium' | 'large' | 'giant';

@Component({
    template: '',
})
export default abstract class ButtonBase implements OnDestroy {

    readonly icon = input<IconCode>();
    readonly iconSize = input<IconSize>('smaller');
    readonly iconFilled = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly iconColored = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly title = input<string>();
    readonly type = input<ButtonType>('primary');
    readonly color = input<ColorName, ColorName>('accent', { transform: c => c ?? 'accent' });
    readonly highlight = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly size = input<ButtonSize>('medium');
    readonly disabled = input(false);
    readonly shortcut = input<string | null>(null);
    readonly shortcutWithoutCtrl = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected readonly hoverNudgeEnabled = xcomputed([this.disabled, this.type],
        (disabled, type) => !disabled && type !== 'subtle' && type !== 'transparent');
    
    protected readonly classes = xcomputed([this.type, this.size, this.color, this.disabled, this.iconColored],
        (type, size, color, disabled, iconColored) =>
            `${type} ${size} ${color}-btn ${disabled ? 'disabled' : ''} ${iconColored ? 'icon-colored' : ''}`);
    
    protected readonly document = inject<Document>(DOCUMENT);
    private readonly hoverNudge = getHoverNudge(this.document);
    protected readonly windowService = inject(WindowService);
    private hotkeySubscription: Subscription | undefined;
    private justClickedSomething = false;

    constructor() {
        xeffect([this.shortcut, this.shortcutWithoutCtrl], (shortcut, shortcutWithoutCtrl) => {
            this.hotkeySubscription?.unsubscribe();
            if (!shortcut) return;
            this.hotkeySubscription = (shortcutWithoutCtrl
                ? this.windowService.onKeyPressed(shortcut)
                : this.windowService.onCtrlAndKeyPressed(shortcut))
                    .subscribe(this.execute.bind(this));
        });
    }

    ngOnDestroy() {
        this.hotkeySubscription?.unsubscribe();
    }

    abstract execute(): void;

    protected mouseEnter(event: MouseEvent) {
        if (!this.hoverNudgeEnabled()) return;
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) return;
        this.hoverNudge.nudgeOnMouseEnter(event, target);
    }
    
    
    protected isRealClick() {
        if (this.justClickedSomething)
            return false;
        this.justClickedSomething = true;
        setTimeout(() => this.justClickedSomething = false, 50);
        return true;
    }
}
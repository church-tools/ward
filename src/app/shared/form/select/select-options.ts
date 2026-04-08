import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal, TemplateRef, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { xcomputed, xeffect } from '../../utils/signal-utils';
import { AnchoredPopover, PopoverPosition } from '../anchored-popover/anchored-popover';

export type SelectOptionsTemplateContext<T> = {
    $implicit: T;
    option: T;
    focused: boolean;
};

@Component({
    selector: 'app-select-options',
    imports: [TranslateModule, NgTemplateOutlet, AnchoredPopover],
    template: `
        <app-anchored-popover #popover
            [position]="position()"
            alignment="center"
            [anchorElement]="anchorElement()"
            [offsetY]="2"
            (visibilityChange)="onPopoverVisibilityChange($event)">
            @if (useDefaultTemplate()) {
                <div class="options-card"
                    [class.position-top]="position() === 'top'"
                    [class.position-bottom]="position() === 'bottom'"
                    [style.width.px]="width()">
                    @for (option of options(); track trackOption(option)) {
                        <div class="option" [class.focused]="focusedOption() === option"
                            [class]="optionClass()(option)"
                            (mousedown)="onOptionMouseDown($event)"
                            (click)="onOptionClick(option)">
                            @if (optionTemplate(); as template) {
                                <ng-container *ngTemplateOutlet="template; context: getTemplateContext(option)"/>
                            } @else {
                                {{ optionToText()(option) }}
                            }
                        </div>
                    }
                    @if (showNoMatches()) {
                        <div class="option disabled">{{ noMatchesText() | translate }}</div>
                    }
                </div>
            } @else {
                <ng-content/>
            }
        </app-anchored-popover>
    `,
    styles: [`
        .options-card {
            box-sizing: border-box;
            max-width: min(calc(100vw - 0.5rem), 32rem);
            display: flex;
            flex-direction: column;
            padding: 0;
            gap: 0;
        }

        .option {
            border-radius: var(--input-border-radius, 0.5rem);
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            transition: all 0.15s ease-out;
        }

        .option:hover,
        .option.focused {
            background-color: var(--input-option-hover-background-color, color-mix(in srgb, currentColor 10%, transparent));
        }

        .option.disabled {
            cursor: default;
            opacity: 0.7;
        }

        .option.disabled:hover {
            background-color: transparent;
        }
    `],
})
export class SelectOptions<T = unknown> {
    private readonly anchoredPopover = viewChild.required(AnchoredPopover);

    readonly anchorElement = input<HTMLElement | null>(null);
    readonly contentVisible = input<boolean>(false);

    readonly options = input<readonly T[]>([]);
    readonly searchText = input<string>('');
    readonly noMatchesText = input<string>('NO_MATCHES');
    readonly useDefaultTemplate = input<boolean>(true);
    readonly optionTemplate = input<TemplateRef<SelectOptionsTemplateContext<T>> | null>(null);

    readonly optionToText = input<(option: T) => string>((option: T) => {
        const candidate = option as { view?: string };
        return candidate.view ?? String(option ?? '');
    });
    readonly optionTrackBy = input<(option: T) => unknown>((option: T) => option);
    readonly optionClass = input<(option: T) => string>(() => '');

    readonly optionClick = output<T>();
    readonly closed = output<void>();

    readonly position = signal<PopoverPosition>('bottom');
    readonly width = signal<number>(0);

    private readonly requested = signal(false);
    private readonly closing = signal(false);
    private readonly focusedIndex = signal(-1);

    readonly focusedOption = xcomputed([this.options, this.focusedIndex], (options, focusedIndex) => {
        if (focusedIndex < 0 || focusedIndex >= options.length)
            return null;
        return options[focusedIndex] ?? null;
    });

    readonly showNoMatches = xcomputed([this.options, this.searchText], (options, searchText) =>
        options.length === 0 && !!searchText.trim());

    readonly visible = xcomputed([this.contentVisible, this.requested, this.closing],
        (contentVisible, requested, closing) => requested && !closing && contentVisible);

    constructor() {
        xeffect([this.anchoredPopover, this.visible], (popover, visible) => {
            if (!popover) return;
            if (visible) popover.show();
            else popover.hide();
        });
    }

    get anchorNameCss() {
        return this.anchoredPopover().anchorNameCss;
    }

    open() {
        if (this.requested())
            return;
        const anchor = this.anchorElement();
        if (!anchor)
            return;
        const anchorRect = anchor.getBoundingClientRect();
        const anchorMiddle = anchorRect.top + (anchorRect.height / 2);
        const isInUpperHalf = anchorMiddle < (window.innerHeight / 2);
        this.position.set(isInUpperHalf ? 'bottom' : 'top');
        this.width.set(anchorRect.width - 10);
        this.focusedIndex.set(-1);
        this.requested.set(true);
    }

    close() {
        if (!this.requested())
            return;
        this.requested.set(false);
        this.closing.set(true);
        this.focusedIndex.set(-1);
        setTimeout(() => {
            if (this.requested())
                return;
            this.closing.set(false);
        }, 100);
    }

    isRequested() {
        return this.requested();
    }

    onPopoverVisibilityChange(visible: boolean) {
        if (visible)
            return;
        this.requested.set(false);
        this.closing.set(false);
        this.focusedIndex.set(-1);
        this.closed.emit();
    }

    handleKeyDown(event: KeyboardEvent) {
        if (!this.requested())
            return false;
        const options = this.options();
        if (event.key === 'Tab') {
            this.close();
            return true;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
            return true;
        }
        if (!options.length)
            return false;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.focusNextOption(1, options);
            return true;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.focusNextOption(-1, options);
            return true;
        }
        if (event.key === 'Home') {
            event.preventDefault();
            this.focusOptionAt(0, options);
            return true;
        }
        if (event.key === 'End') {
            event.preventDefault();
            this.focusOptionAt(options.length - 1, options);
            return true;
        }
        if (event.key === 'Enter' && this.focusedOption()) {
            event.preventDefault();
            this.optionClick.emit(this.focusedOption()!);
            return true;
        }
        return false;
    }

    protected onOptionClick(option: T) {
        this.optionClick.emit(option);
    }

    protected onOptionMouseDown(event: MouseEvent) {
        event.preventDefault();
    }

    protected getTemplateContext(option: T): SelectOptionsTemplateContext<T> {
        return {
            $implicit: option,
            option,
            focused: this.focusedOption() === option,
        };
    }

    protected trackOption(option: T) {
        return this.optionTrackBy()(option);
    }

    private focusNextOption(offset: number, options: readonly T[]) {
        let index = this.focusedIndex();
        index = index < 0
            ? (offset > 0 ? 0 : options.length - 1)
            : (index + offset + options.length) % options.length;
        this.focusedIndex.set(index);
    }

    private focusOptionAt(index: number, options: readonly T[]) {
        if (!options.length)
            return;
        const bounded = Math.max(0, Math.min(index, options.length - 1));
        this.focusedIndex.set(bounded);
    }
}

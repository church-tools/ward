import { ColorName } from '@/shared/utils/color-utils';
import { Icon } from '@/shared/icon/icon';
import { asyncComputed, xcomputed, xsignal } from '@/shared/utils/signal-utils';
import ErrorMessage from '@/shared/widget/error-message/error-message';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, ElementRef, input, Signal, viewChild, viewChildren } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HorizontalDragDirective } from '../../shared/horizontal-drag.directive';
import { HorizontalDragGesture } from '../../shared/horizontal-drag-gesture';
import { getProviders, InputBase } from '../../shared/input-base';
import InputLabel from '../../shared/input-label';
import { SelectOption } from '../select';

@Component({
    selector: 'app-switch-select',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule, Icon, InputLabel, ErrorMessage, HorizontalDragDirective],
    templateUrl: './switch-select.html',
    styleUrl: './switch-select.scss',
    providers: getProviders(() => SwitchSelect)
})
export default class SwitchSelect<T> extends InputBase<T> {

    private suppressNextClick = false;
    private lastDragIndex = -1;

    private readonly buttonsContainerView = viewChild('buttonsContainer', { read: ElementRef }) as Signal<ElementRef<HTMLDivElement> | undefined>;
    private readonly optionButtonViews = viewChildren('optionButton', { read: ElementRef }) as Signal<readonly ElementRef<HTMLButtonElement>[]>;
    private readonly optionValueViews = viewChildren('optionValue', { read: ElementRef }) as Signal<readonly ElementRef<HTMLElement>[]>;
    protected readonly dragPointerX = xsignal<number | null>(null);
    protected readonly dragging = xsignal(false);

    protected readonly drag = new HorizontalDragGesture({
        getElement: () => this.buttonsContainerView()?.nativeElement,
        thresholdPx: 4,
        onDown: (clientX, event) => {
            this.dragPointerX.set(null);
            this.dragging.set(false);
            this.lastDragIndex = -1;
            const target = event.target as HTMLElement | null;
            if (!target?.closest('button'))
                this.selectOptionAtClientX(clientX, true);
        },
        onMove: (clientX, moved, event) => {
            if (!moved)
                return;
            this.dragging.set(true);
            this.dragPointerX.set(clientX);
            this.selectOptionAtClientX(clientX);
            event.preventDefault();
        },
        onEnd: (clientX, moved, event) => {
            const target = event.target as HTMLElement | null;
            if (moved) {
                this.selectOptionAtClientX(clientX, true);
                this.blockNextClick();
                event.preventDefault();
                event.stopPropagation();
            } else if (!target?.closest('button')) {
                this.selectOptionAtClientX(clientX, true);
                event.preventDefault();
                event.stopPropagation();
            }
            this.resetDragState();
        },
        onCancel: () => this.resetDragState(),
    });

    readonly color = input<ColorName>('accent');
    readonly options = input.required<readonly SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();
    readonly onGroupClick = input<(group: { id: string; label: string; color?: string }) => void>();
    readonly withoutValue = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly mapSearch = input<(search: string) => string>();
    readonly translateOptions = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly onOptionClick = input<(option: SelectOption<T>, event: MouseEvent) => void>();

    protected readonly optionArray = asyncComputed([this.options], async (options) => {
        return typeof options === 'function'
            ? await options('')
            : options;
    }, [] as readonly SelectOption<T>[]);
    protected readonly selectedOption = xcomputed([this.optionArray, this.viewValue],
        (options, value) => options.find(option => option.value === value) ?? null);
    protected readonly valueString = xcomputed([this.selectedOption], option => option?.view ?? '');
    protected readonly selectedIndex = xcomputed([this.optionArray, this.viewValue],
        (options, value) => options.findIndex(option => option.value === value));
    protected readonly indicatorVisible = xcomputed([this.selectedIndex], index => index >= 0);
    protected readonly indicatorWidth = xcomputed(
        [this.optionButtonViews, this.optionValueViews, this.selectedIndex],
        (buttonViews, valueViews, index) => {
            if (index < 0)
                return '0px';
            const button = buttonViews[index]?.nativeElement;
            const value = valueViews[index]?.nativeElement;
            if (!button || !value)
                return '0px';
            const valueWidth = value.getBoundingClientRect().width;
            const styles = getComputedStyle(button);
            const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
            return `${Math.max(valueWidth + horizontalPadding, 0)}px`;
        });
    protected readonly indicatorTransform = xcomputed(
        [this.dragPointerX, this.buttonsContainerView, this.optionButtonViews, this.indicatorWidth, this.selectedIndex],
        (dragPointerX, buttonsContainerView, buttonViews, indicatorWidth, index) => {
            if (index < 0)
                return 'translateX(0px)';
            const buttonsContainer = buttonsContainerView?.nativeElement;
            const button = buttonViews[index]?.nativeElement;
            if (!buttonsContainer || !button)
                return 'translateX(0px)';

            const width = parseFloat(indicatorWidth);
            const containerRect = buttonsContainer.getBoundingClientRect();
            const containerLeft = containerRect.left + buttonsContainer.clientLeft;
            const containerWidth = buttonsContainer.clientWidth;
            const maxLeft = Math.max(containerWidth - width, 0);
            if (dragPointerX != null) {
                const pointerLeft = dragPointerX - containerLeft - width / 2;
                const dragOffset = Math.min(Math.max(pointerLeft, 0), maxLeft);
                return `translateX(${this.snapToDevicePixel(dragOffset)}px)`;
            }

            const left = button.offsetLeft;
            const offset = left + Math.max((button.offsetWidth - width) / 2, 0);
            const clampedOffset = Math.min(Math.max(offset, 0), maxLeft);
            return `translateX(${this.snapToDevicePixel(clampedOffset)}px)`;
        });

    readonly summary = computed(() => this.valueString());

    protected selectOption(option: SelectOption<T>, event: MouseEvent) {
        if (this.disabled())
            return;
        if (this.suppressNextClick) {
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        event.stopPropagation();
        event.preventDefault();

        const options = this.optionArray();
        const selectedIndex = this.selectedIndex();
        if (selectedIndex >= 0 && options.length > 1 && options[selectedIndex]?.value === option.value) {
            if (selectedIndex === 0) {
                const neighbor = options[1];
                if (neighbor) {
                    this.applyOptionSelection(neighbor, true, event);
                    return;
                }
            } else if (selectedIndex === options.length - 1) {
                const neighbor = options[options.length - 2];
                if (neighbor) {
                    this.applyOptionSelection(neighbor, true, event);
                    return;
                }
            }
        }

        this.applyOptionSelection(option, true, event);
    }

    private applyOptionSelection(option: SelectOption<T>, emitOptionClick: boolean, event?: MouseEvent | PointerEvent) {
        if (this.withoutValue())
            this.emitChange(option.value);
        else if (this.viewValue() !== option.value)
            this.setViewValue(option.value);
        this.markTouched();
        if (emitOptionClick && event)
            this.onOptionClick()?.(option, event as MouseEvent);
    }

    private selectOptionAtClientX(clientX: number, force = false) {
        const options = this.optionArray();
        const buttonViews = this.optionButtonViews();
        if (!options.length || !buttonViews.length)
            return;

        let bestIndex = -1;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < buttonViews.length; index++) {
            const rect = buttonViews[index].nativeElement.getBoundingClientRect();
            const distance = clientX < rect.left
                ? rect.left - clientX
                : clientX > rect.right
                    ? clientX - rect.right
                    : 0;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestIndex = index;
            }
        }

        if (bestIndex < 0)
            return;

        if (!force && this.lastDragIndex === bestIndex)
            return;
        this.lastDragIndex = bestIndex;

        const option = options[bestIndex];
        if (!option)
            return;
        this.applyOptionSelection(option, false);
    }

    private resetDragState() {
        this.dragPointerX.set(null);
        this.dragging.set(false);
        this.lastDragIndex = -1;
    }

    private blockNextClick() {
        this.suppressNextClick = true;
        setTimeout(() => this.suppressNextClick = false, 200);
    }

    private snapToDevicePixel(value: number): number {
        const devicePixelRatio = window.devicePixelRatio || 1;
        return Math.round(value * devicePixelRatio) / devicePixelRatio;
    }

}

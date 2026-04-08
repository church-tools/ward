import { booleanAttribute, ChangeDetectionStrategy, Component, ElementRef, input, Signal, viewChild } from '@angular/core';
import { ColorName } from '../../utils/color-utils';
import { xcomputed, xsignal } from '../../utils/signal-utils';
import ErrorMessage from '../../widget/error-message/error-message';
import { HorizontalDragDirective } from '../shared/horizontal-drag.directive';
import { HorizontalDragGesture } from '../shared/horizontal-drag-gesture';
import { getProviders, InputBase } from '../shared/input-base';
import InputLabel from '../shared/input-label';

@Component({
    selector: 'app-switch',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InputLabel, ErrorMessage, HorizontalDragDirective],
    template: `
        <div class="column">
            <label class="items-center"
                [class.row]="!forceLabelOnTop()"
                [class.column]="forceLabelOnTop()"
                [class.no-wrap]="forceLabelOnSide() && !forceLabelOnTop()"
                [class.reverse]="labelSide() === 'right' && !forceLabelOnTop()">
                <app-input-label/>
                <div #switchTrack class="switch {{color()}}-fg" [class.checked]="viewValue()"
                    [class.dragging]="dragging()"
                    [style.--thumb-translate.px]="thumbTranslate()"
                    [horizontalDrag]="drag"
                    [horizontalDragDisabled]="disabled()">
                    <input title="{{label()}}" type="checkbox"
                        [checked]="viewValue()" (click)="onClick($event)"
                        [disabled]="disabled()">
                    <svg fill="currentcolor" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" fill="currentColor"></path>
                    </svg>
                </div>
            </label>
            <app-error-message/>
        </div>`,
    styleUrl: './switch.scss',
    providers: getProviders(() => Switch)
})
export default class Switch extends InputBase<boolean> {

    private readonly switchTrack = viewChild('switchTrack', { read: ElementRef }) as Signal<ElementRef<HTMLDivElement> | undefined>;
    private readonly dragTranslate = xsignal<number | null>(null);
    protected readonly dragging = xcomputed([this.dragTranslate], dragTranslate => dragTranslate != null);
    protected readonly thumbTranslate = xcomputed([this.dragTranslate, this.viewValue], (dragTranslate, value) =>
        dragTranslate ?? (value ? 20 : 0));

    private suppressNextClick = false;

    protected readonly drag = new HorizontalDragGesture({
        getElement: () => this.switchTrack()?.nativeElement,
        thresholdPx: 4,
        onMove: (clientX, moved, event) => {
            if (!moved)
                return;
            const position = this.getSwitchPosition(clientX);
            if (!position)
                return;
            this.dragTranslate.set(position.translate);
            this.setViewValue(position.checked);
            event.preventDefault();
        },
        onEnd: (clientX, moved, event) => {
            if (moved) {
                const position = this.getSwitchPosition(clientX);
                if (position)
                    this.setViewValue(position.checked);
                this.suppressNextClick = true;
                setTimeout(() => this.suppressNextClick = false, 200);
                event.preventDefault();
                event.stopPropagation();
            }
            this.dragTranslate.set(null);
        },
        onCancel: () => this.dragTranslate.set(null),
    });

    readonly color = input<ColorName>('accent');
    readonly forceLabelOnTop = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly forceLabelOnSide = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly labelSide = input<'left' | 'right'>('right');

    protected onClick(event: MouseEvent): void {
        if (this.suppressNextClick) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!this.isRealClick()) return;
        this.setViewValue(!(this.viewValue() ?? false));
        event.stopPropagation();
    }

    private getSwitchPosition(clientX: number): { checked: boolean, translate: number } | null {
        const switchTrack = this.switchTrack()?.nativeElement;
        if (!switchTrack)
            return null;
        const rect = switchTrack.getBoundingClientRect();
        const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const checked = clampedX >= rect.width / 2;
        return { checked, translate: (clampedX / rect.width) * 20 };
    }
}

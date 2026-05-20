import { booleanAttribute, Directive, input } from '@angular/core';
import { HorizontalDragGesture } from './horizontal-drag-gesture';

@Directive({
    selector: '[horizontalDrag]',
    host: {
        '(pointerdown)': 'onPointerDown($event)',
        '(pointermove)': 'onPointerMove($event)',
        '(pointerup)': 'onPointerUp($event)',
        '(pointercancel)': 'onPointerCancel($event)',
    },
})
export class HorizontalDragDirective {

    readonly horizontalDrag = input.required<HorizontalDragGesture>();
    readonly horizontalDragDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

    onPointerDown(event: PointerEvent): void {
        if (this.horizontalDragDisabled())
            return;
        this.horizontalDrag().onPointerDown(event);
    }

    onPointerMove(event: PointerEvent): void {
        this.horizontalDrag().onPointerMove(event);
    }

    onPointerUp(event: PointerEvent): void {
        this.horizontalDrag().onPointerUp(event);
    }

    onPointerCancel(event: PointerEvent): void {
        this.horizontalDrag().onPointerCancel(event);
    }
}
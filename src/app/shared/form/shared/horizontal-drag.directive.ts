import { booleanAttribute, Directive, HostListener, input } from '@angular/core';
import { HorizontalDragGesture } from './horizontal-drag-gesture';

@Directive({
    selector: '[horizontalDrag]'
})
export class HorizontalDragDirective {

    readonly horizontalDrag = input.required<HorizontalDragGesture>();
    readonly horizontalDragDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

    @HostListener('pointerdown', ['$event'])
    onPointerDown(event: PointerEvent): void {
        if (this.horizontalDragDisabled())
            return;
        this.horizontalDrag().onPointerDown(event);
    }

    @HostListener('pointermove', ['$event'])
    onPointerMove(event: PointerEvent): void {
        this.horizontalDrag().onPointerMove(event);
    }

    @HostListener('pointerup', ['$event'])
    onPointerUp(event: PointerEvent): void {
        this.horizontalDrag().onPointerUp(event);
    }

    @HostListener('pointercancel', ['$event'])
    onPointerCancel(event: PointerEvent): void {
        this.horizontalDrag().onPointerCancel(event);
    }
}
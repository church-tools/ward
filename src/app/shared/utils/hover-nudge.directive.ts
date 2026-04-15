import { Directive, DOCUMENT, ElementRef, booleanAttribute, inject, input } from '@angular/core';
import { getHoverNudge } from './hover-nudge';

@Directive({
    selector: '[appHoverNudge]',
    standalone: true,
    host: {
        '(mouseenter)': 'onMouseEnter($event)',
    },
})
export class HoverNudgeDirective {

    readonly appHoverNudge = input<boolean, unknown>(true, { transform: booleanAttribute });
    readonly hoverNudgeDistance = input(2);
    readonly hoverNudgeMinSpeed = input(0.5);
    readonly hoverNudgeMaxSpeed = input(8);

    private readonly document = inject<Document>(DOCUMENT);
    private readonly elementRef = inject(ElementRef<HTMLElement>);
    private readonly hoverNudge = getHoverNudge(this.document);

    protected onMouseEnter(event: MouseEvent) {
        if (!this.appHoverNudge()) return;
        this.hoverNudge.nudgeOnMouseEnter(event, this.elementRef.nativeElement, {
            distance: this.hoverNudgeDistance(),
            minSpeed: this.hoverNudgeMinSpeed(),
            maxSpeed: this.hoverNudgeMaxSpeed(),
        });
    }

}

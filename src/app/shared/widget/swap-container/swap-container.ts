import { Component, ElementRef, inject, input, Signal, signal, viewChild } from "@angular/core";
import { wait } from "../../utils/flow-control-utils";
import { xcomputed, xeffect } from "../../utils/signal-utils";

@Component({
    selector: 'app-swap-container',
    template: `
        <div #mainMeasuring class="container"
            [class.visible]="!swap()"
            [class.fading]="containers[0].fading()">
            <ng-content select="[main]"/>
        </div>
        <div #swappedMeasuring class="container"
            [class.visible]="swap()"
            [class.fading]="containers[1].fading()">
            <ng-content select="[swapped]"/>
        </div>
    `,
    styleUrl: './swap-container.scss',
    host: {
        '[class]': 'animationClass()',
    }
})
export class SwapContainerComponent {

    private readonly element = inject(ElementRef);

    readonly swap = input(false);
    readonly animationDuration = input<'xs' | 'sm' | 'md' | 'lg'>('md');

    private readonly mainMeasuring: Signal<ElementRef<HTMLDivElement>> = viewChild.required('mainMeasuring', { read: ElementRef });
    private readonly swappedMeasuring: Signal<ElementRef<HTMLDivElement>> = viewChild.required('swappedMeasuring', { read: ElementRef });

    protected readonly animationClass = xcomputed([this.animationDuration],
        duration => `animation-${duration}`);
    private readonly animationDurationMs = xcomputed([this.animationDuration], duration => {
        switch (duration) {
            case 'xs': return 100;
            case 'sm': return 200;
            case 'lg': return 500;
            default: return 300;
        }
    });


    protected readonly containers = [
        { measuring: this.mainMeasuring, fading: signal(false) },
        { measuring: this.swappedMeasuring, fading: signal(false) },
    ] as const;

    constructor() {
        xeffect([this.swap], swap => {
            const newIndex = +swap;
            const [newContainer, prevContainer] = [this.containers[newIndex], this.containers[1 - newIndex]];
            prevContainer.fading.set(true);
            setTimeout(() => {
                // prevContainer.measuring().nativeElement.style.display = 'none';
                // newContainer.measuring().nativeElement.style.display = '';
                prevContainer.fading.set(false);
            }, this.animationDurationMs());
            this.adjustToSize(newContainer.measuring());
        });
    }

    private async adjustToSize(measuring: ElementRef<HTMLDivElement>) {
        const div = this.element.nativeElement;
        div.style.overflow = "hidden";
        div.style.height = `${div.clientHeight}px`;
        await wait(0);
        div.style.height = `${measuring.nativeElement.clientHeight}px`;
        await wait(this.animationDurationMs());
        div.style.height = 'auto';
        div.style.overflow = 'visible';
    }
}

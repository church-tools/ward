import { ChangeDetectionStrategy, Component, ElementRef, effect, input, signal, inject } from "@angular/core";

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Component({
    selector: 'app-tooltip-popup',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible() || fading()) {
            <div class="tooltip acrylic-card" [class.fading]="fading()" [style]="style()"
                (mouseenter)="show(true)" (mouseleave)="show(false)">
                <ng-content/>
            </div>
        }
    `,
    styles: [`
        :host {
            display: contents;
        }
        .tooltip {
            animation: appearDropdown 0.1s ease;
            position: absolute;
            z-index: 2;
            padding: 2px 5px;
            width: max-content;
            max-width: 300pt;
            &.fading {
                animation: disappearDropdown 0.1s ease;
                opacity: 0;
            }
        }
    `],
    host: {
        '(mouseenter)': 'show(true)',
        '(mouseleave)': 'show(false)',
    },
})
export class TooltipPopupComponent  {

    protected readonly position = input<TooltipPosition>('bottom');
    protected readonly openOnHover = input(true);
    
    protected readonly visible = signal(false);
    protected readonly fading = signal(false);
    protected readonly style = signal<Partial<CSSStyleDeclaration>>({});

    private shouldBeVisible = 0;
    private timeout: NodeJS.Timeout | undefined;

    constructor() {
        const elementRef = inject(ElementRef);
        const parent: HTMLElement = elementRef.nativeElement.parentElement;
        if (!parent) return;
        parent.addEventListener('click', () => this.toggle());
        parent.style.cursor = 'pointer';
        switch (this.position()) {
            case 'top': this.style.set({ bottom: '100%' }); break;
            case 'bottom': this.style.set({ top: '100%', left: '0' }); break;
            case 'left': this.style.set({ right: '100%' }); break;
            case 'right': this.style.set({ left: '100%' }); break;
        }
        parent.addEventListener('mouseleave', () => this.show(false));
        effect(() => {
            if (this.openOnHover())
                parent.addEventListener('mouseenter', () => this.show(true));
            else
                parent.removeEventListener('mouseenter', () => this.show(true));
        })
    }

    protected toggle() {
        this.shouldBeVisible = this.visible() ? 0 : 1;
        this.setVisibility(this.shouldBeVisible > 0);
    }

    protected show(show: boolean) {
        this.shouldBeVisible += show ? 1 : -1;
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.setVisibility(this.shouldBeVisible > 0), 500);
    }

    private setVisibility(visible: boolean) {
        if (this.visible() === visible) return;
        this.visible.set(visible);
        this.fading.set(!visible);
        if (this.fading())
            setTimeout(() => this.fading.set(false), 100);
    }
}
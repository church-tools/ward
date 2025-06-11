import { Component, ElementRef, Signal, inject, input, output, signal, viewChild } from '@angular/core';

@Component({
    selector: 'app-collapse',
    template: `<div #measuring class="measuring"><ng-content/></div>`,
    styles: [`
        :host {
            height: 0;
            opacity: 0;
            display: block;
            overflow: hidden;
            &:not(.instantly) {
                transition: all 0.3s ease;
            }
            .measuring {
                box-sizing: content-box;
            }
        }
    `],
})
export default class CollapseComponent {

    private readonly element = inject(ElementRef);

    protected readonly measuring: Signal<ElementRef<HTMLDivElement> | undefined> = viewChild('measuring', { read: ElementRef });

    private readonly _collapsed = signal<boolean>(true);
    readonly collapsed = this._collapsed.asReadonly();

    private _show = false;
    protected readonly show = input<boolean, boolean>(false, { transform: v => { this.setExpanded(v); return v; } });
    protected readonly onChange = output<boolean>();

    async toggle() {
        this.setExpanded(!this._show);
    }

    async setExpanded(expanded: boolean, instantly = false) {
        if (this._show === expanded) return;
        this._show = expanded;
        this._collapsed.set(!expanded);
        const div = this.element.nativeElement;
        if (instantly) {
            div.classList.add('instantly');
            div.style.height = this._show ? 'auto' : '0';
            div.style.opacity = this._show ? "1" : "0";
            div.style.overflow = this._show ? "visible" : "hidden";
            await new Promise(resolve => setTimeout(resolve, 1));
            div.classList.remove('instantly');
        } else {
            div.style.overflow = "hidden";
            await new Promise(resolve => setTimeout(resolve, 1));
            const height = this.measuring()?.nativeElement.clientHeight;
            if (!this._show && div.style.height === 'auto') {
                div.style.height = height + "px";
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            div.style.height = (this._show ? height : 0) + "px";
            div.style.opacity = this._show ? "1" : "0";
            await new Promise(resolve => setTimeout(resolve, 300));
            if (this._show) {
                div.style.height = 'auto';
                div.style.overflow = 'visible';
            }
        }
        this.onChange.emit(expanded);
    }

}

import { Component, ElementRef, Signal, inject, input, output, signal, viewChild } from '@angular/core';
import { wait } from '../../utils/flow-control-utils';
import { animationDurationLgMs } from '@/shared/utils/style';

@Component({
    selector: 'app-collapse',
    template: `<div #measuring class="measuring"><ng-content/></div>`,
    styleUrl: './collapse.scss',
})
export default class Collapse {

    private readonly element = inject(ElementRef);

    protected readonly measuring: Signal<ElementRef<HTMLDivElement>> = viewChild.required('measuring', { read: ElementRef });

    private readonly _collapsed = signal(true);
    readonly collapsed = this._collapsed.asReadonly();
    private readonly _contentVisible = signal(false);
    readonly contentVisible = this._contentVisible.asReadonly();

    private _show = false;
    /** Identifies the running transition, so an interrupted one stops instead of finishing over the new state. */
    private transition = 0;
    private followContent?: ResizeObserver;

    readonly show = input<boolean, boolean>(false, { transform: v => { this.setExpanded(v); return v; } });

    async toggle() {
        this.setExpanded(!this._show);
    }

    async setExpanded(expanded: boolean, instantly = false) {
        if (this._show === expanded) return;
        this._show = expanded;
        this._collapsed.set(!expanded);
        if (expanded)
            this._contentVisible.set(expanded);
        const transition = ++this.transition;
        const interrupted = () => transition !== this.transition;
        this.followContent?.disconnect();
        const div = this.element.nativeElement;
        if (instantly) {
            div.classList.add('instantly');
            div.style.height = this._show ? 'auto' : '0';
            div.style.opacity = this._show ? "1" : "0";
            div.style.overflow = this._show ? "visible" : "hidden";
            await wait(1);
            div.classList.remove('instantly');
        } else {
            div.style.overflow = "hidden";
            await wait(1);
            if (interrupted()) return;
            const content = this.measuring().nativeElement;
            const height = content.clientHeight;
            if (!this._show && div.style.height === 'auto') {
                div.style.height = height + "px";
                await new Promise(resolve => setTimeout(resolve, 50));
                if (interrupted()) return;
            }
            div.style.height = (this._show ? height : 0) + "px";
            div.style.opacity = this._show ? "1" : "0";
            if (this._show) {
                this.followContent = new ResizeObserver(() => {
                    if (div.style.height !== 'auto')
                        div.style.height = content.clientHeight + 'px';
                });
                this.followContent.observe(content);
            }
            await new Promise(resolve => setTimeout(resolve, animationDurationLgMs));
            if (interrupted()) return;
            this.followContent?.disconnect();
            if (this._show) {
                div.style.height = 'auto';
                div.style.overflow = 'visible';
            }
        }
        this._contentVisible.set(expanded);
    }

}

import { afterNextRender, ApplicationRef, Component, ElementRef, inject, signal, ViewContainerRef } from '@angular/core';

export const LEAVE_ANIMATION = 'page-leave-animation';

@Component({
    selector: 'app-page',
    template: ``,
    host: {
        class: "page column gap-3",
        '[class.page-enter-animation]': 'entering()',
        '[class.page-entered]': 'entered()',
    }
})
export abstract class PageComponent {

    private readonly renderer = (inject(ViewContainerRef) as any)._hostLView?.[11] as { delegate?: any, data?: any };
    private readonly el = inject(ElementRef).nativeElement;
    private readonly app = inject(ApplicationRef);

    protected readonly entering = signal(true);
    protected readonly entered = signal(false);

    constructor() {
        setTimeout(() => this.entered.set(true), 200);
        setTimeout(() => this.entering.set(false), 350);
        if (!this.renderer) return;
        const renderer = this.renderer.delegate || this.renderer;
        const { removeChild, data } = renderer;

        if (data[LEAVE_ANIMATION]) {
            data[LEAVE_ANIMATION].push(this.el);
            return;
        }

        data[LEAVE_ANIMATION] = [this.el];

        afterNextRender(() => {
            renderer.removeChild = (parent: Node, el: Node, host?: boolean) => {
                const remove = (): void => removeChild.call(renderer, parent, el, host);
                const elements: Element[] = data[LEAVE_ANIMATION];
                const element = elements.find(leave => el.contains(leave));

                if (!element) {
                    remove();
                    return;
                }
                this.entering.set(false);

                const { length } = element.getAnimations();

                elements.splice(elements.indexOf(element), 1);
                element.classList.add(LEAVE_ANIMATION);

                const animations = element.getAnimations();
                const last = animations.at(-1);
                const finish = (): void => {
                    if (!parent || parent.contains(el)) {
                        remove();
                        this.app.tick();
                    }
                };

                if (animations.length > length && last) {
                    last.onfinish = finish;
                    last.oncancel = finish;
                } else {
                    remove();
                }
            };
        });
    }
    
    public ngOnDestroy(): void {
        const data = this.renderer?.data || { [LEAVE_ANIMATION]: [] };
        setTimeout(() => data[LEAVE_ANIMATION] = data[LEAVE_ANIMATION].filter((e: Element) => e !== this.el));
    }

}
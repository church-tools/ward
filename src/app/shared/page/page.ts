import { Component, ElementRef, inject, signal } from '@angular/core';

export const LEAVE_ANIMATION = 'page-leave-animation';

@Component({
    selector: 'app-page',
    template: ``,
    host: {
        class: "page column gap-3",
        '[class.page-enter]': 'entering()',
        '[class.page-entered]': 'entered()',
        '[style.view-transition-name]': 'viewTransitionName',
    }
})
export abstract class PageComponent {

    private readonly el = inject(ElementRef).nativeElement;
    
    protected readonly entering = signal(true);
    protected readonly entered = signal(false);
    protected readonly viewTransitionName = 'page-' + Math.random().toString(36).substr(2, 9);

    constructor() {
        setTimeout(() => this.entered.set(true), 100);
        setTimeout(() => this.entering.set(false), 300);
        this.el.style.viewTransitionName = this.viewTransitionName;
    }
}
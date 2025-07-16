import { Component, ElementRef, inject } from '@angular/core';

export const LEAVE_ANIMATION = 'page-leave-animation';

@Component({
    selector: 'app-page',
    template: ``,
    host: {
        class: "page column gap-3",
    }
})
export abstract class PageComponent {

    readonly el = inject(ElementRef).nativeElement as HTMLElement;
}
import { Component, ElementRef, inject } from '@angular/core';

export const LEAVE_ANIMATION = 'page-leave-animation';

@Component({
    selector: 'app-page',
    template: ``,
    host: {
        class: "page column gap-3",
    }
})
export abstract class Page {

    readonly el = inject(ElementRef).nativeElement as HTMLElement;

    public onLeaving() {}
    
    public closePopup!: () => Promise<void>;
}
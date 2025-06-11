import { Component, signal } from '@angular/core';

@Component({
    selector: 'app-page',
    template: ``,
    host: {
        class: "animated column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class PageComponent {
    
    protected readonly show = signal<boolean>(true);
}
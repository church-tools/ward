import { Component, signal } from '@angular/core';
import { PageComponent } from '../../shared/page/page';

@Component({
    selector: 'app-private-page',
    template: ``,
    host: {
        class: "column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class PrivatePageComponent extends PageComponent {
    
    protected readonly show = signal<boolean>(true);

    readonly editMode = signal<boolean>(false);
}
import { Component } from '@angular/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-callings-page',
    template: `
        <span class="h0">Berufungen</span>
        <p>Callings component content goes here.</p>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
})
export class CallingsPageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
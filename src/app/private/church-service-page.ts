import { Component } from '@angular/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0" i18n>Church Service</span>
        <p>Service component content goes here.</p>
    `,
    host: { class: 'page narrow' },
})
export class ChurchServicePageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
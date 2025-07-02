import { Component } from '@angular/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0">Gottesdienst</span>
        <p>Service component content goes here.</p>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
})
export class ChurchServicePageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
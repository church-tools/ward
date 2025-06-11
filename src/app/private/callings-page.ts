import { Component } from '@angular/core';
import { PageComponent } from '../shared/page/page';

@Component({
    selector: 'app-callings-page',
    template: `
        <span class="display-text">Berufungen</span>
        <p>Callings component content goes here.</p>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
})
export class CallingsPageComponent extends PageComponent {

    constructor() {
        super();
    }

}
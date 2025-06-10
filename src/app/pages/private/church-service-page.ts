import { Component } from '@angular/core';
import { PageComponent } from '../shared/page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Gottesdienst</span>
        <p>Service component content goes here.</p>
    `,
    styleUrls: ['../shared/page.scss'],
    host: { class: 'narrow' },
})
export class ChurchServicePageComponent extends PageComponent {

    constructor() {
        super();
    }

}
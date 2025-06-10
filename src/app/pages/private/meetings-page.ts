import { Component } from '@angular/core';
import { PageComponent } from '../shared/page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Sitzungen</span>
        <p>Meetings component content goes here.</p>
    `,
    styleUrls: ['../shared/page.scss'],
    host: { class: 'narrow' },
})
export class MeetingsPageComponent extends PageComponent {

    constructor() {
        super();
    }

}
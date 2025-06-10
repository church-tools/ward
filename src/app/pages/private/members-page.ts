import { Component } from '@angular/core';
import { PageComponent } from '../shared/page';

@Component({
    selector: 'app-members-page',
    template: `
        <span class="display-text">Mitglieder</span>
        <p>Members component content goes here.</p>
    `,
    styleUrls: ['../shared/page.scss'],
    host: { class: 'narrow' },
})
export class MembersPageComponent extends PageComponent {

    constructor() {
        super();
    }

}
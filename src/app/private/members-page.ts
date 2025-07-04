import { Component } from '@angular/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-members-page',
    template: `
        <span class="h0">Mitglieder</span>
        <p>Members component content goes here.</p>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
})
export class MembersPageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
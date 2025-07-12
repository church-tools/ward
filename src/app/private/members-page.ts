import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-members-page',
    template: `
        <span class="h0">{{ 'MEMBERS_PAGE.TITLE' | translate }}</span>
        <p>Members component content goes here.</p>
    `,
    imports: [TranslateModule],
    host: { class: 'page narrow' },
})
export class MembersPageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}

import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-unit-approval-page',
    template: `
        <span class="h0">{{ 'UNIT_APPROVAL_PAGE.TITLE' | translate }}</span>
        <p>Callings component content goes here.</p>
    `,
    imports: [TranslateModule],
    host: { class: 'page narrow' },
})
export class UnitApprovalPageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
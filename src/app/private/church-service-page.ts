import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0">{{ 'CHURCH_SERVICE_PAGE.TITLE' | translate }}</span>
        <p>Service component content goes here.</p>
    `,
    imports: [TranslateModule],
    host: { class: 'page narrow' },
})
export class ChurchServicePageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
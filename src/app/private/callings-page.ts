import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PrivatePageComponent } from './shared/private-page';

@Component({
    selector: 'app-callings-page',
    template: `
        <span class="h0">{{ 'CALLINGS_PAGE.TITLE' | translate }}</span>
        <p>Callings component content goes here.</p>
    `,
    imports: [TranslateModule],
    host: { class: 'page narrow' },
})
export class CallingsPageComponent extends PrivatePageComponent {

    constructor() {
        super();
    }

}
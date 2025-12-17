import { Component } from '@angular/core';
import { PageComponent } from '../shared/page/page';
import LinkButtonComponent from '../shared/form/button/link/link-button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">{{ 'NOT_FOUND.TITLE' | translate }}</span>
        <p>{{ 'NOT_FOUND.MESSAGE' | translate }}</p>
        <div class="row center-content mt-8">
            <app-link-button [href]="'/'" size="large" [showNewTab]="false">
                {{ 'NOT_FOUND.GO_HOME' | translate }}
            </app-link-button>
        </div>
    `,
    imports: [LinkButtonComponent, TranslateModule],
    host: { class: 'page narrow' },
})
export class NotFoundPageComponent extends PageComponent {

}
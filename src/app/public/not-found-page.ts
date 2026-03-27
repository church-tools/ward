import { Component } from '@angular/core';
import { Page } from '../shared/page/page';
import LinkButton from '@/shared/form/button/link/link-button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">{{ 'NOT_FOUND.TITLE' | translate }}</span>
        <p>{{ 'NOT_FOUND.MESSAGE' | translate }}</p>
        <div class="row center-content mt-8">
            <app-link-button [href]="'/'" size="large" hideNewTab>
                {{ 'NOT_FOUND.GO_HOME' | translate }}
            </app-link-button>
        </div>
    `,
    imports: [LinkButton, TranslateModule],
    host: { class: 'page narrow' },
})
export class NotFoundPage extends Page {

}
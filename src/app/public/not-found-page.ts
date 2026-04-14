import { Component } from '@angular/core';
import { Page } from '../shared/page/page';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">{{ 'NOT_FOUND.TITLE' | localize }}</span>
        <p>{{ 'NOT_FOUND.MESSAGE' | localize }}</p>
        <div class="row center-content mt-8">
            <app-link-button [href]="'/'" size="large" hideNewTab>
                {{ 'NOT_FOUND.GO_HOME' | localize }}
            </app-link-button>
        </div>
    `,
    imports: [LinkButton, LocalizePipe],
    host: { class: 'page narrow' },
})
export class NotFoundPage extends Page {

}
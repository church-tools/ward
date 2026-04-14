import { Component } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Icon } from '../shared/icon/icon';
import { Page } from '../shared/page/page';

@Component({
    selector: 'app-confirm-email-page',
    template: `
        <span class="display-text text-center">{{ 'CONFIRM_EMAIL.TITLE' | localize }}</span>
        <p class="text-center">{{ 'CONFIRM_EMAIL.MESSAGE' | localize }}</p>
        <div class="row center-content mt-8">
            <app-icon icon="mail_unread" size="xxxxl" filled class="accent-text"/>
        </div>
    `,
    imports: [Icon, LocalizePipe],
    host: { class: 'page portrait' },
})
export class ConfirmEmailPage extends Page {

}
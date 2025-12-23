import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../shared/icon/icon';
import { PageComponent } from '../shared/page/page';

@Component({
    selector: 'app-confirm-email-page',
    template: `
        <span class="display-text text-center">{{ 'CONFIRM_EMAIL.TITLE' | translate }}</span>
        <p class="text-center">{{ 'CONFIRM_EMAIL.MESSAGE' | translate }}</p>
        <div class="row center-content mt-8">
            <app-icon icon="mail_unread" size="xxxxl" [filled]="true" class="accent-text"/>
        </div>
    `,
    imports: [IconComponent, TranslateModule],
    host: { class: 'page portrait' },
})
export class ConfirmEmailPageComponent extends PageComponent {

}
import { Component } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Icon } from '../../shared/icon/icon';
import { Page } from '../../shared/page/page';

@Component({
    selector: 'app-setup-rejected-page',
    template: `
        <span class="display-text text-center">{{ 'SETUP_REJECTED.TITLE' | localize }}</span>
        <p class="text-center">{{ 'SETUP_REJECTED.MESSAGE' | localize }}</p>
        <div class="row center-content mt-8">
            <app-icon icon="dismiss" size="xxxxl" filled class="accent-text"/>
        </div>
    `,
    imports: [Icon, LocalizePipe],
    host: { class: 'page portrait' },
})
export class SetupRejectedPage extends Page {

}
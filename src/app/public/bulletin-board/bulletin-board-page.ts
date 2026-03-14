import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Page } from '../../shared/page/page';

@Component({
    selector: 'app-bulletin-board-page',
    template: `
        <span class="display-text">{{ 'BULLETIN_BOARD.TITLE' | translate }}</span>
    `,
    imports: [TranslateModule],
    host: { class: 'page narrow' },
})
export class BulletinBoardPage extends Page {

}
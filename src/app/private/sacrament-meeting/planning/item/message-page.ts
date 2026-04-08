import { MessageViewService } from '@/modules/sacrament-meeting/item/message/message-view.service';
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-message-page',
    template: `
        @let row = syncedRow.value();
        <h2>
            <span class="text-secondary">{{ 'VIEW.MESSAGE' | translate }}:</span>
            {{ row ? messageView.toString(row) : '' }}
        </h2>
        <div class="column-grid">
            <app-text-input [syncedRow]="syncedRow" column="speaker"
                class="col-12"
                label="{{ 'MESSAGE_PAGE.SPEAKER' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="topic"
                class="col-12"
                label="{{ 'MESSAGE_PAGE.TOPIC' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="duration"
                class="col-md-4"
                label="{{ 'MESSAGE_PAGE.DURATION' | translate }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, SyncedFieldDirective, TextInput, RowHistory],
})
export class MessagePage extends RowPage<'message'> {

    protected readonly tableName = 'message';
    protected readonly messageView = inject(MessageViewService);

}

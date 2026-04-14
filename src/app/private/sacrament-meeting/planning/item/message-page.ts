import { MessageViewService } from '@/modules/sacrament-meeting/item/message/message-view.service';
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';
import { CustomRowSelect } from "@/shared/form/row-select/custom-row-select";

@Component({
    selector: 'app-message-page',
    template: `
        @let row = syncedRow.value();
        <h2>
            <span class="text-secondary">{{ 'VIEW.MESSAGE' | localize }}:</span>
            {{ row ? messageView.toString(row) : '' }}
        </h2>
        <div class="column-grid">
            <app-custom-row-select [syncedRow]="syncedRow" column="speaker" table="member"
                class="col-12"
                label="{{ 'MESSAGE_PAGE.SPEAKER' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="topic"
                class="col-12"
                label="{{ 'MESSAGE_PAGE.TOPIC' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="duration"
                class="col-md-4"
                label="{{ 'MESSAGE_PAGE.DURATION' | localize }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, TextInput, RowHistory, CustomRowSelect],
})
export class MessagePage extends RowPage<'message'> {

    protected readonly tableName = 'message';
    protected readonly messageView = inject(MessageViewService);

}

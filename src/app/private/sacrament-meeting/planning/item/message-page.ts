import type { Message } from '@/modules/sacrament-meeting/item/message/message';
import { MessageViewService } from '@/modules/sacrament-meeting/item/message/message-view.service';
import { CustomRowSelect } from "@/shared/form/row-select/custom-row-select";
import type { SelectOption } from '@/shared/form/select/select-utils';
import SwitchSelect from '@/shared/form/select/switch/switch-select';
import { TextInput } from '@/shared/form/text/text-input';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { xcomputed } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-message-page',
    template: `
        @let row = syncedRow.value();
        @if (isCustomText()) {
            <h4 class="mb--4">{{ 'SACRAMENT_MEETING_PAGE.CUSTOM_TEXT' | localize }}</h4>
        } @else {
            <h4 class="mb--4">{{ 'MESSAGE_PAGE.TYPE.' + row?.type?.toUpperCase() | localize }}</h4>
        }
        <h3>{{ row ? messageView.toString(row) : '' }}</h3>
        <div class="column-grid">
            @if (isCustomText()) {
                <app-text-input [syncedRow]="syncedRow" column="topic"
                    class="col-12"
                    label="{{ 'SACRAMENT_MEETING_PAGE.CUSTOM_TEXT' | localize }}"/>
            } @else {
                <app-switch-select [syncedRow]="syncedRow" column="type"
                    class="col-12"
                    label="{{ 'SACRAMENT_MEETING_PAGE.TYPE' | localize }}"
                    [options]="typeOptions"
                    appearance="button"
                    translateOptions/>
                <app-custom-row-select [syncedRow]="syncedRow" column="speaker" table="member"
                    class="col-12"
                    label="{{ 'MESSAGE_PAGE.SPEAKER' | localize }}"/>
                <app-text-input [syncedRow]="syncedRow" column="topic"
                    class="col-12"
                    label="{{ 'MESSAGE_PAGE.TOPIC' | localize }}"/>
                <app-text-input [syncedRow]="syncedRow" column="duration"
                    class="col-md-4"
                    label="{{ 'MESSAGE_PAGE.DURATION' | localize }}"/>
            }
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, TextInput, RowHistory, CustomRowSelect, SwitchSelect],
})
export class MessagePage extends RowPage<'message'> {

    protected readonly tableName = 'message';
    protected readonly messageView = inject(MessageViewService);
    protected readonly isCustomText = xcomputed([this.syncedRow.value], row => !row?.speaker);
    protected readonly typeOptions = [
        { value: 'message', view: 'MESSAGE_PAGE.TYPE.MESSAGE' },
        { value: 'testimony', view: 'MESSAGE_PAGE.TYPE.TESTIMONY' },
    ] as SelectOption<Message.Type>[];

}

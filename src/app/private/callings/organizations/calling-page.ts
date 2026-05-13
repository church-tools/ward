import { CallingViewService } from '@/modules/calling/calling-view.service';
import { RowHistory } from '@/private/shared/row-history';
import { RowPage } from '@/private/shared/row-page';
import { RichText } from "@/shared/form/rich-text/rich-text";
import { Select } from "@/shared/form/select/select";
import { SelectResult } from "@/shared/form/select/select-result";
import { TextInput } from '@/shared/form/text/text-input';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { Component, inject } from '@angular/core';

@Component({
    selector: 'app-calling-page',
    template: `
        <h1>
            {{ callingView.toString(syncedRow.value()!) }}
        </h1>
        <div class="column-grid">
            <!-- <app-select [syncedRow]="syncedRow" column="gender"
                class="col-md-2" name="gender"
                [options]="callingView.salutationGenderOptions" translateOptions
                label="{{ 'CALLING_PAGE.SALUTATION' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="first_name"
                class="col-md-5" name="first_name"
                label="{{ 'CALLING_PAGE.FIRST_NAME' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="nick_name"
                class="col-md-5" name="nick_name"
                label="{{ 'CALLING_PAGE.NICK_NAME' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="last_name"
                class="col-12" name="last_name"
                label="{{ 'CALLING_PAGE.LAST_NAME' | localize }}"/>
            <app-rich-text [syncedRow]="syncedRow" column="notes" name="notes"
                class="col-12" label="{{ 'CALLING_PAGE.NOTES' | localize }}"/> -->
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, TextInput, RowHistory,
        SyncedFieldDirective, Select, SelectResult, RichText],
})
export class CallingPage extends RowPage<'calling'> {

    protected readonly callingView = inject(CallingViewService);

    protected readonly tableName = 'calling';
    
}
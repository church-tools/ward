import { CallingViewService } from '@/modules/calling/calling-view.service';
import { CallingService } from '@/modules/calling/calling.service';
import { RowHistory } from '@/private/shared/row-history';
import { RowPage } from '@/private/shared/row-page';
import { RelatedRowSelect } from '@/shared/form/row-select/related-row-select';
import { Select } from "@/shared/form/select/select";
import Switch from '@/shared/form/switch/switch';
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
            <app-text-input class="col-md-12" [syncedRow]="syncedRow" column="full_name" name="full_name"
                label="{{ 'CALLING_PAGE.FULL_NAME' | localize }}"/>
            
            <app-select [syncedRow]="syncedRow" column="gender_restriction"
                class="col-md-7" name="gender"
                [options]="callingView.genderOptions" translateOptions
                label="{{ 'CALLING_PAGE.GENDER' | localize }}"/>
            <app-switch [syncedRow]="syncedRow" column="is_unique" class="col-md-5" name="is_unique"
                label="{{ 'CALLING_PAGE.IS_UNIQUE' | localize }}"
                info="{{ 'CALLING_PAGE.IS_UNIQUE_INFO' | localize }}"
                forceLabelOnTop/>
            @if (syncedRow.value(); as row) {
                <app-related-row-select class="col-md-12"
                    label="{{ 'VIEW.MEMBERS' | localize }}"
                    [parent]="row"
                    parentTable="calling"
                    parentIdKey="calling"
                    relatedTable="member"
                    relationTable="member_calling"
                    [getRelatedQuery]="callingService.getMemberQuery"
                    relatedIdKey="member"
                    [multiple]="!row.is_unique"
                    [mapInsert]="callingService.mapMemberCallingInsert"
                    hideClear/>
            }
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, TextInput, RowHistory,
        SyncedFieldDirective, Select, RelatedRowSelect, Switch],
})
export class CallingPage extends RowPage<'calling'> {

    protected readonly callingService = inject(CallingService);
    protected readonly callingView = inject(CallingViewService);

    protected readonly tableName = 'calling';
    
}
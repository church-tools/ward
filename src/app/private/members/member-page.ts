import { MemberViewService } from '@/modules/member/member-view.service';
import { RichText } from "@/shared/form/rich-text/rich-text";
import { Select } from "@/shared/form/select/select";
import { SelectResult } from "@/shared/form/select/select-result";
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-member-page',
    template: `
        <h1>
            <app-select-result [optionsByValue]="memberView.salutationOptionsByGender"
                [value]="syncedRow.value()?.gender" translateOptions/>
            {{ memberView.toString(syncedRow.value()!) }}
        </h1>
        <div class="column-grid">
            <app-select [syncedRow]="syncedRow" column="gender"
                class="col-md-2" name="gender"
                [options]="memberView.salutationGenderOptions" translateOptions
                label="{{ 'MEMBER_PAGE.SALUTATION' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="first_name"
                class="col-md-5" name="first_name"
                label="{{ 'MEMBER_PAGE.FIRST_NAME' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="nick_name"
                class="col-md-5" name="nick_name"
                label="{{ 'MEMBER_PAGE.NICK_NAME' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="last_name"
                class="col-12" name="last_name"
                label="{{ 'MEMBER_PAGE.LAST_NAME' | translate }}"/>
            <app-rich-text [syncedRow]="syncedRow" column="notes" name="notes"
                class="col-12" label="{{ 'NOTES' | translate }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, TextInput, RowHistory,
    SyncedFieldDirective, Select, SelectResult, RichText],
})
export class MemberPage extends RowPage<'member'> {

    protected readonly memberView = inject(MemberViewService);

    protected readonly tableName = 'member';
    
}
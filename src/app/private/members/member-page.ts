import { MemberViewService } from '@/modules/member/member-view.service';
import { RichText } from "@/shared/form/rich-text/rich-text";
import { Select } from "@/shared/form/select/select";
import { SelectResult } from "@/shared/form/select/select-result";
import Switch from '@/shared/form/switch/switch';
import { TextInput } from '@/shared/form/text/text-input';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { asyncComputed } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { Component, inject } from '@angular/core';
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-member-page',
    template: `
        <h1>
            @if (syncedRow.value(); as member) {
                <app-select-result [optionsByValue]="memberView.salutationOptionsByGender"
                    [value]="member.gender" translateOptions/>
                {{ memberView.toString(member) }}
            }
        </h1>
        <div class="column-grid">
            <app-select [syncedRow]="syncedRow" column="gender"
                class="col-md-2" name="gender"
                [options]="memberView.salutationGenderOptions" translateOptions
                label="{{ 'MEMBER_PAGE.SALUTATION' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="first_name"
                class="col-md-5" name="first_name"
                label="{{ 'MEMBER_PAGE.FIRST_NAME' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="nick_name"
                class="col-md-5" name="nick_name"
                label="{{ 'MEMBER_PAGE.NICK_NAME' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="last_name"
                class="col-6" name="last_name"
                label="{{ 'MEMBER_PAGE.LAST_NAME' | localize }}"/>
            <app-select [syncedRow]="syncedRow" column="household"
                class="col-6" name="household" [required]="true"
                [options]="householdOptions()"
                label="{{ 'VIEW.HOUSEHOLD' | localize }}"/>
            <app-rich-text [syncedRow]="syncedRow" column="notes" name="notes"
                class="col-12" label="{{ 'NOTES' | localize }}"/>
            <app-switch [syncedRow]="syncedRow" column="can_minister" name="can_minister"
                class="col-12" label="{{ 'MEMBER_PAGE.CAN_MINISTER' | localize }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, TextInput, RowHistory,
        SyncedFieldDirective, Select, SelectResult, RichText, Switch],
})
export class MemberPage extends RowPage<'member'> {

    protected readonly memberView = inject(MemberViewService);

    protected readonly tableName = 'member';

    protected readonly householdOptions = asyncComputed([], async () => {
        const households = await this.supabase.sync.from('household').readAll().get();
        return households
            .sort((a, b) => compareText(a.name, b.name))
            .map(household => ({ value: household.id, view: household.name }));
    }, []);

}

function compareText(a: string, b: string) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' }) || a.localeCompare(b);
}
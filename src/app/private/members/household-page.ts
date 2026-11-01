import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { Component } from '@angular/core';
import { RowHistory } from '../shared/row-history';
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-household-page',
    template: `
        <app-text-input [syncedRow]="syncedRow" column="name" name="name"
            textClass="h1" subtle/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInput, RowHistory, SyncedFieldDirective],
})
export class HouseholdPage extends RowPage<'household'> {

    protected readonly tableName = 'household';
}

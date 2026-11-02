import { ColorPicker } from '@/shared/form/color-picker/color-picker';
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
        <div class="row wrap gap-4 items-center">
            <app-color-picker [syncedRow]="syncedRow" column="color_1" name="color_1"/>
            <app-color-picker [syncedRow]="syncedRow" column="color_2" name="color_2"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInput, RowHistory, SyncedFieldDirective, ColorPicker],
})
export class HouseholdPage extends RowPage<'household'> {

    protected readonly tableName = 'household';
}

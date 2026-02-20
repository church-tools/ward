import { Component } from '@angular/core';
import { ColorPickerComponent } from "../../../shared/form/color-picker/color-picker";
import { TextInputComponent } from '../../../shared/form/text/text-input';
import { SyncedFieldDirective } from '../../../shared/utils/supa-sync/synced-field.directive';
import { RowHistoryComponent } from '../../shared/row-history';
import { RowPageComponent } from '../../shared/row-page';

@Component({
    selector: 'app-organization-page',
    template: `
        <div class="row no-wrap gap-2 items-center">
            <app-color-picker [syncedRow]="syncedRow" column="color" name="color"/>
            <app-text-input class="full-width" [syncedRow]="syncedRow" column="name" name="title" textClass="h1" subtle/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInputComponent, RowHistoryComponent, SyncedFieldDirective, ColorPickerComponent],
})
export class OrganizationPageComponent extends RowPageComponent<'organization'> {

    protected readonly tableName = 'organization';
}
import { Component } from '@angular/core';
import { TextInputComponent } from '../../../shared/form/text/text-input';
import { SyncedFieldDirective } from '../../../shared/utils/supa-sync/synced-field.directive';
import { RowHistoryComponent } from '../../shared/row-history';
import { RowPageComponent } from '../../shared/row-page';

@Component({
    selector: 'app-organization-page',
    template: `
        <app-text-input [syncedRow]="syncedRow" column="name" name="title" textClass="h1"
            [subtle]="true"/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInputComponent, RowHistoryComponent, SyncedFieldDirective],
})
export class OrganizationPageComponent extends RowPageComponent<'organization'> {

    protected readonly tableName = 'organization';
}
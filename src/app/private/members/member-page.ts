import { Component } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../shared/row-history";
import { RowPageComponent } from '../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-text-input [syncedRow]="syncedRow" column="first_name" name="title" textClass="h1"
            [subtle]="true"/>
        <app-text-input [syncedRow]="syncedRow" column="last_name" name="content"/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInputComponent, RowHistoryComponent, SyncedFieldDirective],
})
export class MemberPageComponent extends RowPageComponent<'member'> {

    protected readonly tableName = 'member';
}
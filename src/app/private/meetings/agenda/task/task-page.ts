import { Component } from '@angular/core';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextInputComponent } from '../../../../shared/form/text/text-input';
import { SyncedFieldDirective } from "../../../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../../../shared/row-history";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-text-input [syncedRow]="syncedRow" column="title" name="title" textClass="h1"
            [subtle]="true"/>
        <app-rich-text [syncedRow]="syncedRow" column="content" name="content"/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInputComponent, RichTextComponent, RowHistoryComponent, SyncedFieldDirective],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly tableName = 'task';
}
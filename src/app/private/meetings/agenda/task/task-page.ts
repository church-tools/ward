import { Component } from '@angular/core';
import FileInputComponent from '../../../../shared/form/file/file-input';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextareaComponent } from '../../../../shared/form/text/textarea';
import { SyncedFieldDirective } from "../../../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../../../shared/row-history";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-textarea [syncedRow]="syncedRow" column="title" name="title" textClass="h3"
            [subtle]="true"/>
        <app-rich-text [syncedRow]="syncedRow" column="content" name="content"/>
        <app-file-input [syncedRow]="syncedRow" column="files" name="files"/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextareaComponent, RichTextComponent, RowHistoryComponent, SyncedFieldDirective,
        FileInputComponent],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly tableName = 'task';
}
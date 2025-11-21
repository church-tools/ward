import { Component } from '@angular/core';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextInputComponent } from '../../../../shared/form/text/text-input';
import { SupaSyncedDirective } from "../../../../shared/utils/supa-sync/supa-synced.directive";
import { RowHistoryComponent } from "../../../shared/row-history";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-text-input [supaSynced]="table" [row]="row()" column="title" name="title" textClass="h1"
            [subtle]="true"/>
        <app-rich-text [supaSynced]="table" [row]="row()" column="content" name="content"/>
        <app-row-history [row]="row()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextInputComponent, RichTextComponent, RowHistoryComponent, SupaSyncedDirective],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly tableName = 'task';
}
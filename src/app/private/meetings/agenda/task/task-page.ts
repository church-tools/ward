import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextInputComponent } from '../../../../shared/form/text/text-input';
import { property } from '../../../../shared/utils/signal-utils';
import { RowPageComponent } from '../../../shared/row-page';
import { RowHistoryComponent } from "../../../shared/row-history";

@Component({
    selector: 'app-task-page',
    template: `
        <app-text-input [(ngModel)]="taskTitle" name="title" textClass="h1"
            [subtle]="true"/>
        <app-rich-text [(ngModel)]="taskContent" name="content"/>
        <app-row-history [row]="row()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [FormsModule, TextInputComponent, RichTextComponent, RowHistoryComponent],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly taskTitle = property(this.row, 'title');
    protected readonly taskContent = property(this.row, 'content');
    protected readonly tableName = 'task';
}
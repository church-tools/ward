import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../../modules/task/task.service';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextInputComponent } from '../../../../shared/form/text/text-input';
import { property } from '../../../../shared/utils/signal-utils';
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-text-input [(ngModel)]="taskTitle" name="title" textClass="h1"
            [subtle]="true"/>
        <app-rich-text [(ngModel)]="taskContent" name="content"/>
    `,
    host: { class: 'page narrow' },
    imports: [FormsModule, TextInputComponent, RichTextComponent],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly taskTitle = property(this.row, 'title');
    protected readonly taskContent = property(this.row, 'content');

    constructor() {
        super(inject(TaskService));
    }
}
import { Component, inject } from '@angular/core';
import { TaskService } from '../../../../modules/task/task.service';
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <span class="h0">{{title()}}</span>
        Test
        
    `,
    styleUrls: ['../../../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    constructor() {
        super(inject(TaskService));
    }
}
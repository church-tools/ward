import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-task-list-row',
    template: `
        <div class="column m-4">
            <h4><span class="overflow-ellipsis">{{ row().title }}</span></h4>
        </div>
    `,
})
export class TaskListRowComponent extends ListRowComponent<'task'> {


}
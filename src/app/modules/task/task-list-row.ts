import { Component } from '@angular/core';
import { markdownToPlainText } from '../../shared/form/rich-text/markdown-utils';
import { IconComponent } from '../../shared/icon/icon';
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-task-list-row',
    template: `
        <div class="column m-4 gap-1">
            <h4><span class="overflow-ellipsis">{{ row().title }}</span></h4>
            <div class="row gap-1">
                @if (row().files?.length) {
                    <app-icon icon="attach" size="sm"/>
                }
                <span class="small-text overflow-ellipsis">{{ contentString() }}</span>
            </div>
        </div>
    `,
    imports: [IconComponent],
})
export class TaskListRowComponent extends ListRowComponent<'task'> {

    protected readonly contentString = xcomputed([this.row],
        row => markdownToPlainText(row.content).replace(/\n+/gm, '; '));

    
}
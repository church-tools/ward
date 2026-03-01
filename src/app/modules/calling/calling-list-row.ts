import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/row-card-list/list-row';

@Component({
    selector: 'app-calling-list-row',
    template: `
        <div class="row m-3-4">
            <span class="overflow-ellipsis">{{ row().name }}</span>
        </div>
    `,
})
export class CallingListRowComponent extends ListRowComponent<'calling'> {

}

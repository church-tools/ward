import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-member-list-row',
    template: `
        <div class="row no-wrap full-width items-center m-6-8">
            <h3 class="grow-1">
                <span class="overflow-ellipsis">{{ row().first_name }}</span>
            </h3>
        </div>
    `,
    host: {
        class: 'full-width row items-center',
    }
})
export class MemberListRowComponent extends ListRowComponent<'member'> {

}
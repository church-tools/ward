import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-member-list-row',
    template: `
        <div class="column m-4">
            <h4>
                {{ row().nick_name || row().first_name }} {{ row().last_name }}
            </h4>
        </div>
    `,
})
export class MemberListRowComponent extends ListRowComponent<'member'> {

}
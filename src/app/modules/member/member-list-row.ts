import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';

@Component({
    selector: 'app-member-list-row',
    template: `
        <div class="row m-4">
            <h4>
                {{ row().nick_name || row().first_name }} {{ row().last_name }}
            </h4>
        </div>
    `,
})
export class MemberListRowComponent extends ListRowComponent<'member'> {

}
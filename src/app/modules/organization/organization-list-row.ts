import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/row-card-list/list-row';

@Component({
    selector: 'app-organization-list-row',
    template: `
        <div class="row m-4">
            <h4>
                {{ row().name }}
            </h4>
        </div>
    `,
})
export class OrganizationListRowComponent extends ListRowComponent<'organization'> {

}
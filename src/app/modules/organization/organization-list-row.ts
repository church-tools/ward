import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/row-card-list/list-row';

@Component({
    selector: 'app-organization-list-row',
    template: `
        <div class="row m-4">
            <h4 class="{{row().color}}-text grow-1">
                {{ row().name }}
            </h4>
            <ng-content/>
        </div>
    `,
})
export class OrganizationListRowComponent extends ListRowComponent<'organization'> {

}
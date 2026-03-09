import { Component, inject } from '@angular/core';
import { SelectResultComponent } from "../../shared/form/select/select-result";
import { ListRowComponent } from '../shared/row-card-list/list-row';
import { MemberViewService } from './member-view.service';

@Component({
    selector: 'app-member-list-row',
    template: `
        <div class="row m-4">
            <h4>
                <app-select-result [optionsByValue]="memberView.salutationOptionsByGender" [value]="row().gender" translateOptions/>
                {{ memberView.toString(row()) }}
            </h4>
        </div>
    `,
    imports: [SelectResultComponent],
})
export class MemberListRowComponent extends ListRowComponent<'member'> {

    protected readonly memberView = inject(MemberViewService);
}
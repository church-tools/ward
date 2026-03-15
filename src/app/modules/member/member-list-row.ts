import { Component, inject } from '@angular/core';
import { SelectResult } from "../../shared/form/select/select-result";
import { ListRow } from '../shared/row-card-list/list-row';
import { MemberViewService } from './member-view.service';

@Component({
    selector: 'app-member-list-row',
    template: `
        <div class="row m-4">
            <h4>
                <app-select-result [optionsByValue]="memberView.salutationOptionsByGender"
                    [value]="row().gender" translateOptions/>
                {{ memberView.toString(row()) }}
            </h4>
        </div>
    `,
    imports: [SelectResult],
})
export class MemberListRow extends ListRow<'member'> {

    protected readonly memberView = inject(MemberViewService);
}
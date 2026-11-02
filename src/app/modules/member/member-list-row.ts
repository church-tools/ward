import { xcomputed } from '@/shared/utils/signal-utils';
import { Component, inject, input } from '@angular/core';
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
                {{ name() }}
            </h4>
        </div>
    `,
    imports: [SelectResult],
})
export class MemberListRow extends ListRow<'member'> {

    /** Listed inside a household, a last name equal to the household's is not repeated. */
    readonly household = input<string>();

    protected readonly memberView = inject(MemberViewService);

    protected readonly name = xcomputed([this.row, this.household], (row, household) => {
        household = household?.trim().toLowerCase();
        const sameName = !!household && household === row.last_name?.trim().toLowerCase();
        return this.memberView.toString(sameName ? { ...row, last_name: '' } : row).trim();
    });
}
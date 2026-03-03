import { Component } from '@angular/core';
import { RowSelectComponent } from "../../shared/form/row-select/row-select";
import { xcomputed } from '../../shared/utils/signal-utils';
import { ListRowComponent } from '../shared/row-card-list/list-row';
import { Table } from '../shared/table.types';

@Component({
    selector: 'app-calling-list-row',
    template: `
        <div class="row m-3-4">
            <span class="overflow-ellipsis">{{ row().name }}</span>
            <app-row-select table="member_calling"
                [getQuery]="getMemberCallingQuery()"/>
        </div>
    `,
    imports: [RowSelectComponent],
})
export class CallingListRowComponent extends ListRowComponent<'calling'> {

    protected getMemberCallingQuery = xcomputed([this.row],
        row => (table: Table<'member_calling'>) => table.find()
            .eq('calling', row.id));
}

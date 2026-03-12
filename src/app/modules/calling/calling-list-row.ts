import { Component } from '@angular/core';
import type { Insert, Row, Table, TableQuery } from '../shared/table.types';
import { RelatedRowSelectComponent } from '../../shared/form/row-select/related-row-select';
import { ListRowComponent } from '../shared/row-card-list/list-row';

@Component({
    selector: 'app-calling-list-row',
    template: `
        <div class="row m-2-3">
            <app-related-row-select class="grow-1"
				[label]="row().name"
                [parent]="row()"
				parentTable="calling"
				parentIdKey="calling"
                relatedTable="member"
                relationTable="member_calling"
                [getRelatedQuery]="getMemberQuery"
				relatedIdKey="member"
                [mapInsert]="mapMemberCallingInsert"/>
        </div>
    `,
    imports: [RelatedRowSelectComponent],
})
export class CallingListRowComponent extends ListRowComponent<'calling'> {

	protected readonly getCallingId = (calling: Row<'calling'>) => calling.id;

	protected readonly getMemberQuery = (
		table: Table<'member'>,
		calling: Row<'calling'>,
	): TableQuery<'member', Row<'member'>[]> => calling.gender_restriction
		? table.find().eq('gender', calling.gender_restriction)
		: table.readAll();

	protected readonly mapMemberCallingInsert = (callingId: number, memberId: number): Insert<'member_calling'> => ({
		calling: callingId,
		member: memberId,
		unit: this.row().unit,
		state: 'proposed',
	});
}

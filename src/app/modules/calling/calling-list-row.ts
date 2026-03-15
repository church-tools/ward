import { Component, input } from '@angular/core';
import { RelatedRowSelectComponent } from '../../shared/form/row-select/related-row-select';
import { SelectOption } from '../../shared/form/select/select';
import { ListRow } from '../shared/row-card-list/list-row';
import type { Insert, Row, Table, TableQuery } from '../shared/table.types';

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
				[multiple]="!row().is_unique"
                [mapInsert]="mapMemberCallingInsert"
				[onRelationClick]="onMemberCallingClick()"
				hideClear/>
        </div>
    `,
    imports: [RelatedRowSelectComponent],
})
export class CallingListRow extends ListRow<'calling'> {

	readonly onMemberCallingClick = input<(memberCallingId: number) => void>();

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
		state: 'set_apart',
		unit: this.row().unit,
	});
}

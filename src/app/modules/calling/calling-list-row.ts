import { AdminService } from '@/private/shared/admin.service';
import { RelatedRowSelect } from '@/shared/form/row-select/related-row-select';
import { SupabaseService } from '@/shared/service/supabase.service';
import { asyncComputed } from '@/shared/utils/signal-utils';
import { Component, inject, input } from '@angular/core';
import { ListRow } from '../shared/row-card-list/list-row';
import type { Row } from '../shared/table.types';
import { CallingService } from './calling.service';

@Component({
    selector: 'app-calling-list-row',
    template: `
        <div class="row m-2-3">
			@if (adminService.editMode()) {
				<div class="column gap-1 grow-1">
					<span>{{ row().name }}</span>
					@if (memberNames()) {
						<span class="small-text subtle-text overflow-ellipsis">{{ memberNames() }}</span>
					}
				</div>
			} @else {
				<app-related-row-select class="grow-1"
					[label]="row().name"
					[parent]="row()"
					parentTable="calling"
					parentIdKey="calling"
					relatedTable="member"
					relationTable="member_calling"
					[getRelatedQuery]="callingService.getMemberQuery"
					relatedIdKey="member"
					[multiple]="!row().is_unique"
					[mapInsert]="callingService.mapMemberCallingInsert"
					[onRelationClick]="onMemberCallingClick()"
					hideClear/>
			}
        </div>
    `,
    imports: [RelatedRowSelect],
})
export class CallingListRow extends ListRow<'calling'> {

	protected readonly callingService = inject(CallingService);
	protected readonly adminService = inject(AdminService);
	private readonly supabase = inject(SupabaseService);

	protected readonly memberNames = asyncComputed([this.row, this.adminService.editMode], async (calling, editMode) => {
		if (!editMode) return '';
		const memberCallings = await this.supabase.sync
			.from('member_calling')
			.find()
			.eq('calling', calling.id)
			.get();
		return memberCallings
			.map(memberCalling => memberCalling._calculated.memberName.trim())
			.filter(name => name.length)
			.join(', ');
	}, '');

	readonly onMemberCallingClick = input<(memberCallingId: number) => void>();

	protected readonly getCallingId = (calling: Row<'calling'>) => calling.id;

}

import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CallingListInsert } from '../../../modules/calling/calling-list-insert';
import { CallingListRow } from '../../../modules/calling/calling-list-row';
import { RowCardList } from '../../../modules/shared/row-card-list/row-card-list';
import { Insert, Row, Table } from '../../../modules/shared/table.types';
import { SelectOption } from '../../../shared/form/select/select';
import { WindowService } from '../../../shared/service/window.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { getRowRoute } from '../../private.routes';
import { AdminService } from '../../shared/admin.service';

@Component({
	selector: 'app-organization-callings',
	template: `
		<div class="column p-2 pt-0">
			<app-row-card-list #callingList
				tableName="calling"
				[gap]="1" [columns]="windowService.isSmall() ? 2 : 3"
				[getQuery]="getQuery()"
				[prepareInsert]="prepareInsert"
				cardClasses=""
                [editable]="adminService.editMode() || callingList.rowCount() == 0">
				<ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
					<app-calling-list-row class="full-width"
						[row]="row" [page]="page" [onRemove]="onRemove"
						[onMemberCallingClick]="onMemberCallingClick"/>
				</ng-template>
                <ng-template #insertTemplate let-functions
					let-prepareInsert="prepareInsert" let-context="context">
                    <app-calling-list-insert
                        [insert]="functions.insert"
                        [cancel]="functions.cancel"
                        [prepareInsert]="prepareInsert"
                        [context]="context"/>
                </ng-template>
			</app-row-card-list>
		</div>
	`,
	imports: [TranslateModule, RowCardList, CallingListRow, CallingListInsert],
	host: { class: 'full-width' },
})
export class OrganizationCallings {

    protected readonly windowService = inject(WindowService);
    protected readonly adminService = inject(AdminService);
	protected readonly router = inject(Router);

	readonly organization = input.required<number>();

	protected readonly prepareInsert = (row: Insert<'calling'>) => {
		row.organization = this.organization();
		this.adminService.editMode.set(true);
	};

	protected readonly getQuery = xcomputed([this.organization], organization => ({
		query: (table: Table<'calling'>) => table.find().eq('organization', organization),
		id: `organization_callings_${organization}`
	}));

	protected readonly onMemberCallingClick = (id: number) => {
		const route = getRowRoute({
			table: 'member_calling',
			row: { id } as Row<'member_calling'>,
			currentPage: 'OrganizationsPage',
		});
		this.router.navigate([route]);
	}
}

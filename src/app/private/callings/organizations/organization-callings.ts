import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CallingListInsertComponent } from '../../../modules/calling/calling-list-insert';
import { CallingListRowComponent } from '../../../modules/calling/calling-list-row';
import { RowCardListComponent } from '../../../modules/shared/row-card-list/row-card-list';
import { Insert, Table } from '../../../modules/shared/table.types';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { AdminService } from '../../shared/admin.service';

@Component({
	selector: 'app-organization-callings',
	template: `
		<div class="column p-2 pt-0">
			<app-row-card-list #callingList
				tableName="calling"
				[gap]="1"
				[getQuery]="getQuery()"
				[prepareInsert]="prepareInsert"
				cardClasses=""
                [editable]="adminService.editMode() || !callingList.rowCount()">
				<ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
					<app-calling-list-row [row]="row" [page]="page" [onRemove]="onRemove"/>
				</ng-template>
                <ng-template #insertTemplate let-functions let-prepareInsert="prepareInsert" let-context="context">
                    <app-calling-list-insert
                        [insert]="functions.insert"
                        [cancel]="functions.cancel"
                        [prepareInsert]="prepareInsert"
                        [context]="context"/>
                </ng-template>
			</app-row-card-list>
		</div>
	`,
	imports: [TranslateModule, RowCardListComponent, CallingListRowComponent, CallingListInsertComponent],
	host: { class: 'full-width' },
})
export class OrganizationCallingsComponent {

    protected readonly adminService = inject(AdminService);

	readonly organization = input.required<number>();

	protected readonly prepareInsert = (row: Insert<'calling'>) => {
		row.organization = this.organization();
		this.adminService.editMode.set(true);
	};

	protected readonly getQuery = xcomputed([this.organization], organization => ({
		query: (table: Table<'calling'>) => table.find().eq('organization', organization),
		id: `organization_callings_${organization}`
	}));
}

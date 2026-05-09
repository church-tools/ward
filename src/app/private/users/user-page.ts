import { ProfileService } from '@/modules/profile/profile.service';
import { Insert, Row, Table, TableQuery } from '@/modules/shared/table.types';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { RelatedRowSelect } from '@/shared/form/row-select/related-row-select';
import { RowSelect } from "@/shared/form/row-select/row-select";
import Switch from '@/shared/form/switch/switch';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { asyncComputed, xcomputed } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { Component, inject } from '@angular/core';
import { getRowRoute } from '../private.routes';
import { RowDeleteButton } from "../shared/row-delete-button";
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-user-page',
    template: `
        <h3 class="wrap-anywhere mb-4">{{ syncedRow.value()?.email }}</h3>
        <app-switch label="{{ 'USER_PAGE.IS_ADMIN' | localize }}" forceLabelOnTop
            [syncedRow]="syncedRow" column="is_unit_admin" name="is_unit_admin" disabled/>
        @if (adminService.isUnitAdmin()) {
            <div class="row center-content gap-4">
                @if (isSelf()) {
    
                } @else {
                    @if (syncedRow.value()?.unit_approved) {
                        @if (syncedRow.value()?.is_unit_admin) {
                            <app-async-button icon="shield_dismiss"
                                type="secondary"
                                [onClick]="setAdmin(false)">
                                {{ 'USER_PAGE.REMOVE_ADMIN' | localize }}
                            </app-async-button>
                        } @else {
                            <app-async-button icon="shield_person"
                                type="secondary"
                                [onClick]="setAdmin(true)">
                                {{ 'USER_PAGE.MAKE_ADMIN' | localize }}
                            </app-async-button>
                        }
                    } @else {
                        <app-async-button icon="checkmark" color="success"
                            [onClick]="approve(true)">
                            {{ 'USER_PAGE.APPROVE' | localize }}
                        </app-async-button>
                        <app-async-button icon="dismiss" color="danger"
                            [onClick]="approve(false)">
                            {{ 'USER_PAGE.REJECT' | localize }}
                        </app-async-button>
                    }
                }
            </div>
        }
        <app-row-select [syncedRow]="syncedRow" column="member" table="member"
            name="member" label="{{ 'VIEW.MEMBER' | localize }}"/>
        @if (member(); as member) {
            <app-related-row-select class="grow-1"
                label="{{ 'VIEW.CALLINGS' | localize }}"
                [parent]="member"
                parentTable="member"
                parentIdKey="member"
                relatedTable="calling"
                relationTable="member_calling"
                [getRelatedQuery]="getCallingQuery"
                relatedIdKey="calling"
                multiple
                [mapInsert]="mapMemberCallingInsert"
                [onRelationClick]="onMemberCallingClick"
                hideClear/>
        }
        <div class="row end-content mt-auto">
            @if (adminService.isUnitAdmin() && !syncedRow.value()?.is_unit_admin && !isSelf()) {
                <app-row-delete-button [syncedRow]="syncedRow"/>
            }
        </div>
        <app-row-history [row]="syncedRow.value()"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, RowHistory, SyncedFieldDirective,
        Switch, AsyncButton, RowDeleteButton, RowSelect, RelatedRowSelect],
})
export class UserPage extends RowPage<'profile'> {

    protected readonly tableName = 'profile';

    private readonly profileService = inject(ProfileService);
    private readonly functions = inject(FunctionsService);

    protected readonly isSelf = xcomputed([this.profileService.own, this.syncedRow.id],
        (own, id) => own?.id === id);
    protected readonly member = asyncComputed([this.syncedRow.value],
        async row => row?.member ? this.supabase.sync.from('member').read(row.member).get() : null);

    protected approve(approve: boolean) {
        return async () => {
            const profileId = this.syncedRow.id();
            if (!profileId) return;
            await this.functions.call('approve-user', { profile_id: profileId, approve });
            this.router.navigate(['../'], { relativeTo: this.route });
        }
    }

    protected setAdmin(admin: boolean) {
        return async () => {
            const profileId = this.syncedRow.id();
            if (!profileId) return;
            await this.functions.call('set-user-admin', { profile_id: profileId, set_admin: admin });
        }
    }

	protected readonly getCallingQuery = (
		table: Table<'calling'>,
		member: Row<'member'>,
	): TableQuery<'calling', Row<'calling'>[]> => table.find()
        .in('gender_restriction', ['any', member.gender]);
	// ): TableQuery<'calling', Row<'calling'>[]> => table.readAll();
        
	protected readonly mapMemberCallingInsert = (memberId: number, callingId: number): Insert<'member_calling'> => ({
		calling: callingId,
		member: memberId,
		state: 'set_apart',
		unit: this.member()!.unit,
	});
    
	protected readonly onMemberCallingClick = (id: number) => {
		const route = getRowRoute({
			table: 'member_calling',
			row: { id } as Row<'member_calling'>,
			currentPage: 'OrganizationsPage',
		});
		this.router.navigateByUrl(route, { replaceUrl: this.windowService.shouldReplaceHistory(route) });
	}
}
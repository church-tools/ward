import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileService } from '../../modules/profile/profile.service';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import SwitchComponent from '../../shared/form/switch/switch';
import { xcomputed } from '../../shared/utils/signal-utils';
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../shared/row-history";
import { RowPageComponent } from '../shared/row-page';

@Component({
    selector: 'app-user-page',
    template: `
        <h3 class="wrap-anywhere mb-4">{{ syncedRow.value()?.email }}</h3>
        <app-switch label="{{ 'USER_PAGE.IS_ADMIN' | translate }}" [forceLabelOnTop]="true"
            [syncedRow]="syncedRow" column="is_admin" name="is_admin" [disabled]="true"/>
        <div class="row center-content gap-4">
            @if (isSelf()) {

            } @else {
                @if (syncedRow.value()?.unit_approved) {
                    @if (syncedRow.value()?.is_admin) {
                        <app-async-button icon="shield_dismiss"
                            type="secondary"
                            [onClick]="setAdmin(false)">
                            {{ 'USER_PAGE.REMOVE_ADMIN' | translate }}
                        </app-async-button>
                    } @else {
                        <app-async-button icon="shield_person"
                            type="secondary"
                            [onClick]="setAdmin(true)">
                            {{ 'USER_PAGE.MAKE_ADMIN' | translate }}
                        </app-async-button>
                    }
                } @else {
                    <app-async-button icon="checkmark" color="success"
                        [onClick]="approve(true)">
                        {{ 'USER_PAGE.APPROVE' | translate }}
                    </app-async-button>
                    <app-async-button icon="dismiss" color="danger"
                        [onClick]="approve(false)">
                        {{ 'USER_PAGE.REJECT' | translate }}
                    </app-async-button>
                }
            }
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistoryComponent, SyncedFieldDirective,
        SwitchComponent, AsyncButtonComponent],
})
export class UserPageComponent extends RowPageComponent<'profile'> {

    protected readonly tableName = 'profile';

    private readonly profileService = inject(ProfileService);

    protected readonly isSelf = xcomputed([this.profileService.own, this.syncedRow.id],
        (own, id) => own?.id === id);

    protected approve(approve: boolean) {
        return async () => {
            await this.supabase.callEdgeFunction('approve-user', { profile_id: this.syncedRow.id(), approve });
            this.router.navigate(['../'], { relativeTo: this.route });
        }
    }

    protected setAdmin(admin: boolean) {
        return async () => {
            await this.supabase.callEdgeFunction('set-user-admin', { profile_id: this.syncedRow.id(), set_admin: admin });
        }
    }
}
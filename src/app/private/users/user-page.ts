import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import SwitchComponent from '../../shared/form/switch/switch';
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../shared/row-history";
import { RowPageComponent } from '../shared/row-page';

@Component({
    selector: 'app-user-page',
    template: `
        <h1 class="wrap-anywhere">{{ syncedRow.value()?.email }}</h1>
        <app-switch label="{{ 'USER_PAGE.IS_ADMIN' | translate }}" [forceLabelOnTop]="true"
            [syncedRow]="syncedRow" column="is_admin" name="is_admin" [disabled]="true"/>
        <div class="row center-content gap-4">
            @if (syncedRow.value()?.unit_approved) {
                @if (syncedRow.value()?.is_admin) {
                    <app-async-button icon="shield_dismiss"
                        type="secondary"
                        [onClick]="removeAdmin">
                        {{ 'USER_PAGE.REMOVE_ADMIN' | translate }}
                    </app-async-button>
                } @else {
                    <app-async-button icon="shield_person"
                        type="secondary"
                        [onClick]="makeAdmin">
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
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistoryComponent, SyncedFieldDirective,
        SwitchComponent, AsyncButtonComponent],
})
export class UserPageComponent extends RowPageComponent<'profile'> {

    protected readonly tableName = 'profile';

    protected approve(approve: boolean) {
        return async () => {
            await this.supabase.callEdgeFunction('approve-user', { profile_id: this.syncedRow.id(), approve });
            this.router.navigate(['../'], { relativeTo: this.route });
        }
    }

    protected makeAdmin = async () => {

    }

    protected removeAdmin = async () => {
        
    }
}
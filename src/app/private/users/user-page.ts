import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import SwitchComponent from '../../shared/form/switch/switch';
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../shared/row-history";
import { RowPageComponent } from '../shared/row-page';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';

@Component({
    selector: 'app-user-page',
    template: `
        <h1>{{ syncedRow.value()?.email }}</h1>
        <app-switch label="{{ 'USER_PAGE.IS_ADMIN' | translate }}" [forceLabelOnTop]="true"
            [syncedRow]="syncedRow" column="is_admin" name="is_admin" [disabled]="true"/>
        <div class="row center-content gap-4">
            <app-async-button icon="checkmark" color="success"
                [onClick]="approve">
                {{ 'USER_PAGE.APPROVE' | translate }}
            </app-async-button>
            <app-async-button icon="dismiss" color="danger"
                [onClick]="reject">
                {{ 'USER_PAGE.REJECT' | translate }}
            </app-async-button>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistoryComponent, SyncedFieldDirective,
        SwitchComponent, AsyncButtonComponent],
})
export class UserPageComponent extends RowPageComponent<'profile'> {

    protected readonly tableName = 'profile';

    protected approve = async () => {

    }

    protected reject = async () => {

    }
}
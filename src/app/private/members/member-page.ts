import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../shared/row-history";
import { RowPageComponent } from '../shared/row-page';
import { xcomputed } from '../../shared/utils/signal-utils';
import { MemberViewService } from '../../modules/member/member-view.service';
import { SelectComponent } from "../../shared/form/select/select";

@Component({
    selector: 'app-member-page',
    template: `
        <h1>{{ name() }}</h1>
        <div class="column-grid">
            <app-select [syncedRow]="syncedRow" column="gender"
                class="col-md-2" name="gender"
                [options]="memberView.salutationGenderOptions" translateOptions
                label="{{ 'MEMBER_PAGE.SALUTATION' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="first_name"
                class="col-md-5" name="first_name"
                label="{{ 'MEMBER_PAGE.FIRST_NAME' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="nick_name"
                class="col-md-5" name="nick_name"
                label="{{ 'MEMBER_PAGE.NICK_NAME' | translate }}"/>
            <app-text-input [syncedRow]="syncedRow" column="last_name"
                class="col-12" name="last_name"
                label="{{ 'MEMBER_PAGE.LAST_NAME' | translate }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, TextInputComponent, RowHistoryComponent,
        SyncedFieldDirective, SelectComponent],
})
export class MemberPageComponent extends RowPageComponent<'member'> {

    protected readonly memberView = inject(MemberViewService);

    protected readonly tableName = 'member';

    protected readonly name = xcomputed([this.syncedRow.value], row => {
        if (!row) return '';
        const salutation = this.memberView.salutationOptionsByGender[row.gender].view;
        return `${salutation} ${this.memberView.toString(row)}`;
    });
    
}
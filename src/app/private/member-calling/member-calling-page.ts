import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MemberCallingViewService } from '../../modules/member-calling/member-calling-view.service';
import { MemberViewService } from '../../modules/member/member-view.service';
import { RichText } from "../../shared/form/rich-text/rich-text";
import { RowSelect } from "../../shared/form/row-select/row-select";
import { Select } from "../../shared/form/select/select";
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowDeleteButton } from "../shared/row-delete-button";
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-member-calling-page',
    template: `
        <h1>
            @let calculated = syncedRow.value()?._calculated;
            {{ calculated?.memberName }} •
            @let organization = calculated?.calling?.organization;
            <span class="{{ organization?.color }}-text">
                {{ organization?.name }}
            </span>
            {{ calculated?.calling?.name }}
        </h1>
        <div class="column-grid">
            <div class="col-12">
                <app-select class="col-md-6" [syncedRow]="syncedRow" column="state"
                    [options]="memberCallingView.stateOptions" translateOptions name="state"
                    label="{{ 'STATE' | translate }}"/>
            </div>
            <app-row-select class="col-md-6" [syncedRow]="syncedRow" column="member"
                table="member" label="{{ 'VIEW.MEMBER' | translate }}" name="member"/>
            <app-row-select class="col-md-6" [syncedRow]="syncedRow" column="calling"
                table="calling" label="{{ 'VIEW.CALLING' | translate }}" name="calling"/>
            <app-rich-text class="col-12" [syncedRow]="syncedRow" column="notes" name="notes"
                label="{{ 'NOTES' | translate }}" rows="5"/>
        </div>
        <div class="row end-content mt-auto">
            <app-row-delete-button [syncedRow]="syncedRow" backUrl="../.."/>
        </div>
        <app-row-history [row]="syncedRow.value()"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistory, RowSelect, SyncedFieldDirective, RichText, RowDeleteButton, Select],
})
export class MemberCallingPage extends RowPage<'member_calling'> {

    protected readonly memberView = inject(MemberViewService);
    protected readonly memberCallingView = inject(MemberCallingViewService);

    protected readonly tableName = 'member_calling';
}
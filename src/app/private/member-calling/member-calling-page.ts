import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MemberViewService } from '../../modules/member/member-view.service';
import { RichText } from "../../shared/form/rich-text/rich-text";
import { RowSelect } from "../../shared/form/row-select/row-select";
import { SyncedFieldDirective } from "../../shared/utils/supa-sync/synced-field.directive";
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-member-calling-page',
    template: `
        <h1>
            {{ syncedRow.value()?._calculated?.memberName }} • {{ syncedRow.value()?._calculated?.callingName }}
        </h1>
        <div class="column-grid">
            <app-row-select class="col-md-6" [syncedRow]="syncedRow" column="member"
                table="member" label="{{ 'VIEW.MEMBER' | translate }}" name="member"/>
            <app-row-select class="col-md-6" [syncedRow]="syncedRow" column="calling"
                table="calling" label="{{ 'VIEW.CALLING' | translate }}" name="calling"/>
            <app-rich-text class="col-12" [syncedRow]="syncedRow" column="notes" name="notes"
                label="{{ 'NOTES' | translate }}" rows="5"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistory, RowSelect, SyncedFieldDirective, RichText],
})
export class MemberCallingPage extends RowPage<'member_calling'> {

    protected readonly memberView = inject(MemberViewService);

    protected readonly tableName = 'member_calling';
    
}
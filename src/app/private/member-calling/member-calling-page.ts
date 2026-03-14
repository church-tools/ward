import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MemberViewService } from '../../modules/member/member-view.service';
import { RowHistory } from "../shared/row-history";
import { RowPage } from '../shared/row-page';

@Component({
    selector: 'app-member-calling-page',
    template: `
        <h1>
            {{ syncedRow.value()?._calculated?.memberName }} – {{ syncedRow.value()?._calculated?.callingName }}
        </h1>
        <div class="column-grid">
            
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, RowHistory],
})
export class MemberCallingPage extends RowPage<'member_calling'> {

    protected readonly memberView = inject(MemberViewService);

    protected readonly tableName = 'member_calling';
    
}
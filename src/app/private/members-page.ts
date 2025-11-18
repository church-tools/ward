import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Member } from '../modules/member/member';
import { RowCardListComponent } from "../modules/shared/row-card-list";
import { Table } from '../modules/shared/table.types';
import { xcomputed } from '../shared/utils/signal-utils';
import { RowPageService } from './row-page.service';
import { PrivatePageComponent } from './shared/private-page';
import LinkButtonComponent from '../shared/form/button/link/link-button';

@Component({
    selector: 'app-members-page',
    template: `
        <span class="h0">{{ 'MEMBERS_PAGE.TITLE' | translate }}</span>
        <p>Members component content goes here.</p>
        <div class="row">
            <app-link-button href="https://lcr.churchofjesuschrist.org/records/member-list"
                icon="open"
                [outside]="true" [newTab]="true" type="secondary">
                <span outside>{{ 'MEMBERS_PAGE.LCR_MEMBER_PAGE' | translate }}</span>
            </app-link-button>
        </div>
        <app-row-card-list
            tableName="member"
            [getQuery]="getQuery"
            [editable]="true"
            [page]="this"
            [getUrl]="getMemberUrl"
            [activeId]="activeMemberId()"/>
    `,
    imports: [TranslateModule, RowCardListComponent, LinkButtonComponent],
    host: { class: 'page narrow' },
})
export class MembersPageComponent extends PrivatePageComponent {

    private readonly rowPageService = inject(RowPageService);

    protected readonly activeMemberId = xcomputed([this.rowPageService.openRows],
        openRows => openRows['member'] ?? null);

    constructor() {
        super();
    }
        
    protected getQuery = (table: Table<'member'>) => table.readAll();
        
    protected getMemberUrl = (member: Member.Row | null) => `/members/${member?.id ?? ""}`;
    
}
import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Button } from '@/shared/form/button/button';
import { Select } from "../../shared/form/select/select";
import { TextInput } from '@/shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Member } from './member';
import { MemberViewService } from './member-view.service';

@Component({
    selector: 'app-member-list-insert',
    template: `
        <div class="row gap-1 full-width">
            <app-select #gender class="width-24"
                placeholder="{{ 'MEMBER_PAGE.SALUTATION' | translate }}"
                [options]="memberView.salutationGenderOptions" translateOptions/>
            <app-text-input #firstName class="grow-1" placeholder="{{ 'MEMBER_PAGE.FIRST_NAME' | translate }}"
                (ngModelChange)="updateValidity()"/>
            <app-text-input #lastName class="grow-1" placeholder="{{ 'MEMBER_PAGE.LAST_NAME' | translate }}"
                (ngModelChange)="updateValidity()"/>
            <app-button (onClick)="submit($event)" class="icon-only"
                [icon]="isValid() ? 'save' : 'dismiss'"
                [type]="isValid() ? 'primary' : 'subtle'"
                (ngModelChange)="updateValidity()"/>
        </div>
    `,
    imports: [TranslateModule, Select, TextInput, Button],
})
export class MemberListInsert extends ListInsert<'member'> {

    protected readonly memberView = inject(MemberViewService);

    private readonly genderView = viewChild.required<Select<Member.Gender>>('gender');
    private readonly firstNameView = viewChild.required<TextInput>('firstName');
    private readonly lastNameView = viewChild.required<TextInput>('lastName');

    protected readonly isValid = signal(false);

    protected updateValidity() {
        this.isValid.set(Boolean(this.genderView().getValue())
            && Boolean(this.lastNameView().getValue()));
    }

    protected override getRowInfo(profile: Profile.Row) {
        const gender = this.genderView().getValue();
        const first_name = this.firstNameView().getValue() ?? '';
        const last_name = this.lastNameView().getValue();
        if (!gender || !last_name) return;
        return <Member.Insert>{ gender, first_name, last_name, unit: profile.unit };
    }

}

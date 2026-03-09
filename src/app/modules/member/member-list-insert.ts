import { Component, inject, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import ButtonComponent from '../../shared/form/button/button';
import { SelectComponent } from "../../shared/form/select/select";
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/row-card-list/list-insert';
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
            <app-button (onClick)="submit()" class="icon-only"
                [icon]="isValid() ? 'save' : 'dismiss'"
                [type]="isValid() ? 'primary' : 'subtle'"
                (ngModelChange)="updateValidity()"/>
        </div>
    `,
    imports: [TranslateModule, SelectComponent, TextInputComponent, ButtonComponent],
})
export class MemberListInsertComponent extends ListInsertComponent<'member'> {

    protected readonly memberView = inject(MemberViewService);

    private readonly genderView = viewChild.required<SelectComponent<Member.Gender>>('gender');
    private readonly firstNameView = viewChild.required<TextInputComponent>('firstName');
    private readonly lastNameView = viewChild.required<TextInputComponent>('lastName');

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

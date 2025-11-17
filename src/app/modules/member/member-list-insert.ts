import { Component, viewChild } from '@angular/core';
import ButtonComponent from '../../shared/form/button/button';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/list-insert';
import { Member } from './member';

@Component({
    selector: 'app-member-list-insert',
    template: `
        <app-text-input #firstName/>
        <app-text-input #lastName/>
        <app-button (onClick)="submit()" icon="save" class="icon-only"/>
    `,
    imports: [TextInputComponent, ButtonComponent],
})
export class MemberListInsertComponent extends ListInsertComponent<'member'> {

    private readonly firstNameView = viewChild.required<TextInputComponent>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.firstNameView().getValue();
        if (!name) return;
        return <Member.Insert>{ first_name: name, unit: profile.unit };
    }

}
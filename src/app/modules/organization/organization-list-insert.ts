import { Component, viewChild } from '@angular/core';
import { TextInput } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Organization } from './organization';

@Component({
    selector: 'app-organization-list-insert',
    template: `
        <app-text-input #name (onBlur)="submit()"/>
    `,
    imports: [TextInput],
})
export class OrganizationListInsert extends ListInsert<'organization'> {

    private readonly nameView = viewChild.required<TextInput>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue();
        if (!name) return;
        return <Organization.Insert>{ name, unit: profile.unit };
    }

}
import { Component, viewChild } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/row-card-list/list-insert';
import { Organization } from './organization';

@Component({
    selector: 'app-organization-list-insert',
    template: `
        <app-text-input #name/>
    `,
    imports: [TextInputComponent],
})
export class OrganizationListInsertComponent extends ListInsertComponent<'organization'> {

    private readonly nameView = viewChild.required<TextInputComponent>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue();
        if (!name) return;
        return <Organization.Insert>{ name, unit: profile.unit };
    }

}
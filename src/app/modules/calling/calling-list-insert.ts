import { Component, viewChild } from '@angular/core';
import { TextInput } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Calling } from './calling';

@Component({
    selector: 'app-calling-list-insert',
    template: `
        <app-text-input #name (onBlur)="submit()"/>
    `,
    imports: [TextInput],
})
export class CallingListInsert extends ListInsert<'calling'> {

    private readonly nameView = viewChild.required<TextInput>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue();
        if (!name) return;
        return <Calling.Insert>{ name, unit: profile.unit };
    }

}
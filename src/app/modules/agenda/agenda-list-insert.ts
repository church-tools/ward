import { Component, viewChild } from '@angular/core';
import { TextInput } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Agenda } from './agenda';

@Component({
    selector: 'app-agenda-list-insert',
    template: `
        <app-text-input #name (onBlur)="submit()"/>
    `,
    imports: [TextInput],
})
export class AgendaListInsert extends ListInsert<'agenda'> {

    private readonly nameView = viewChild.required<TextInput>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue();
        if (!name) return;
        return <Agenda.Insert>{ name, unit: profile.unit };
    }

}
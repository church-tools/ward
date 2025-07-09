import { Component, viewChild } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { ListInsertComponent } from '../shared/list-insert';
import { Agenda } from './agenda';
import { Profile } from '../profile/profile';

@Component({
    selector: 'app-agenda-list-insert',
    template: `
        <app-text-input #name (onBlur)="submit()"/>
    `,
    imports: [TextInputComponent],
})
export class AgendaListInsertComponent extends ListInsertComponent<'agenda'> {

    private readonly nameView = viewChild.required<TextInputComponent>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue();
        if (!name) return;
        return <Agenda.Insert>{ name, unit: profile.unit };
    }

}
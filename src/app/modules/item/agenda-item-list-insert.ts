import { Component, viewChild } from '@angular/core';
import { TextInput } from '@/shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { AgendaItem } from './agenda-item';

@Component({
    selector: 'app-agenda-item-list-insert',
    template: `
        <app-text-input #title (onBlur)="submit()"/>
    `,
    imports: [TextInput],
})
export class AgendaItemListInsert extends ListInsert<'agenda_item'> {

    private readonly titleView = viewChild.required<TextInput>('title');

    protected override getRowInfo(profile: Profile.Row) {
        const title = this.titleView().getValue();
        if (!title) return;
        return <AgendaItem.Insert>{ title, unit: profile.unit };
    }

}
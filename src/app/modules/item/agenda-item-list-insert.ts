import { Component, viewChild } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/row-card-list/list-insert';
import { AgendaItem } from './agenda-item';

@Component({
    selector: 'app-agenda-item-list-insert',
    template: `
        <app-text-input #title (onBlur)="submit()"/>
    `,
    imports: [TextInputComponent],
})
export class AgendaItemListInsertComponent extends ListInsertComponent<'agenda_item'> {

    private readonly titleView = viewChild.required<TextInputComponent>('title');

    protected override getRowInfo(profile: Profile.Row) {
        const title = this.titleView().getValue();
        if (!title) return;
        return <AgendaItem.Insert>{ title, unit: profile.unit };
    }

}
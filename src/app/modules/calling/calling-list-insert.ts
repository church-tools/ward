import { Component, viewChild } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/list-insert';
import { Calling } from './calling';

@Component({
    selector: 'app-calling-list-insert',
    template: `
        <app-text-input #title (onBlur)="submit()"/>
    `,
    imports: [TextInputComponent],
})
export class CallingListInsertComponent extends ListInsertComponent<'calling'> {

    private readonly titleView = viewChild.required<TextInputComponent>('title');

    protected override getRowInfo(profile: Profile.Row) {
        const title = this.titleView().getValue();
        if (!title) return;
        return <Calling.Insert><any>{ title, unit: profile.unit }; // TODO
    }

}
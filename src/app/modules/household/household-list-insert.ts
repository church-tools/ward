import { TextInput } from '@/shared/form/text/text-input';
import { randomColorPair } from '@/shared/utils/color-utils';
import { Component, viewChild } from '@angular/core';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Household } from './household';

@Component({
    selector: 'app-household-list-insert',
    template: `
        <app-text-input #name (onBlur)="submit()"/>
    `,
    imports: [TextInput],
})
export class HouseholdListInsert extends ListInsert<'household'> {

    private readonly nameView = viewChild.required<TextInput>('name');

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue()?.trim();
        if (!name) return;
        return <Household.Insert>{ name, unit: profile.unit, ...randomColorPair() };
    }

}

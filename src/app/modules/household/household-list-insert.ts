import { Component, signal, viewChild } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Button } from '@/shared/form/button/button';
import { TextInput } from '@/shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { Household } from './household';

@Component({
    selector: 'app-household-list-insert',
    template: `
        <div class="row gap-1 full-width">
            <app-text-input #name class="grow-1"
                placeholder="{{ 'HOUSEHOLD_PAGE.NAME' | localize }}"
                (ngModelChange)="updateValidity()"/>
            <app-button (onClick)="submit($event)" class="icon-only"
                [icon]="isValid() ? 'save' : 'dismiss'"
                [type]="isValid() ? 'primary' : 'subtle'"/>
        </div>
    `,
    imports: [LocalizePipe, TextInput, Button],
})
export class HouseholdListInsert extends ListInsert<'household'> {

    private readonly nameView = viewChild.required<TextInput>('name');

    protected readonly isValid = signal(false);

    protected updateValidity() {
        this.isValid.set(Boolean(this.nameView().getValue()?.trim()));
    }

    protected override getRowInfo(profile: Profile.Row) {
        const name = this.nameView().getValue()?.trim();
        if (!name) return;
        return <Household.Insert>{ name, unit: profile.unit, deleted: false };
    }

}

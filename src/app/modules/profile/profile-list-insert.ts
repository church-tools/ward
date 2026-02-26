import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../../shared/form/button/async/async-button';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { ListInsertComponent } from '../shared/row-card-list/list-insert';
import { Profile } from './profile';

@Component({
    selector: 'app-profile-list-insert',
    template: `
        <div class="row no-wrap gap-2">
            <app-text-input #email type="email" class="grow-1"
                placeholder="{{ 'USER_PAGE.EMAIL_TO_INVITE' | translate }}"
                [formField]="emailForm"/>
            <app-async-button [onClick]="submit" icon="send" class="icon-only"
                [type]="emailForm().valid() ? 'primary' : 'subtle'"/>
        </div>
    `,
    imports: [FormField, TranslateModule, TextInputComponent, AsyncButtonComponent],
})
export class ProfileListInsertComponent extends ListInsertComponent<'profile'> {

    private readonly email = signal<string>('');

	readonly emailForm = form(this.email, e => {
		required(e, { message: 'CREDENTIALS.ERROR_MSG.EMAIL_REQUIRED' });
		email(e, { message: 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL' });
	});
    protected override getRowInfo(profile: Profile.Row) {
        throw new Error('Method not implemented.');
        return <Profile.Insert>{ };
    }
    
    protected override submit = (): Promise<void> => {
        if (!this.emailForm().valid())
            throw new Error('Invalid form');
        const email = this.email();
        throw new Error('Method not implemented.');
        return super.submit();
    }
}
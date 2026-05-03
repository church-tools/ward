import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { TextInput } from '@/shared/form/text/text-input';
import { ListInsert } from '../shared/row-card-list/list-insert';
import { FunctionsService } from '@/shared/service/functions.service';
import { inject } from '@angular/core';
import { Profile } from './profile';
import { LanguageService } from '@/shared/language/language.service';

@Component({
    selector: 'app-profile-list-insert',
    template: `
        <div class="row no-wrap gap-2">
            <app-text-input #email type="email" class="grow-1"
                placeholder="{{ 'USER_PAGE.EMAIL_TO_INVITE' | localize }}"
                [formField]="emailForm"/>
            <app-async-button [onClick]="submit" icon="send" class="icon-only"
                [type]="emailForm().valid() ? 'primary' : 'subtle'"/>
        </div>
    `,
    imports: [FormField, LocalizePipe, TextInput, AsyncButton],
})
export class ProfileListInsert extends ListInsert<'profile'> {

    private readonly functions = inject(FunctionsService);
    private readonly languageService = inject(LanguageService);

    private readonly email = signal<string>('');

	readonly emailForm = form(this.email, e => {
		required(e, { message: 'CREDENTIALS.ERROR_MSG.EMAIL_REQUIRED' });
		email(e, { message: 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL' });
	});
    protected override getRowInfo(profile: Profile.Row) {
        return undefined;
    }
    
    protected override submit = (): Promise<void> => {
        return (async () => {
            if (!this.emailForm().valid())
                throw 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL';

            try {
                await this.functions.call('auth/send-invitation-email', {
                    email: this.email(),
                    language: this.languageService.current(),
                });
            } catch {
                throw 'ERROR.FAILED';
            }
            this.email.set('');
        })();
    }

}
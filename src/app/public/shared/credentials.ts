import { Component, computed, signal, viewChild } from '@angular/core';
import { FormField, email, form, minLength, pattern, required } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { TextInputComponent } from '../../shared/form/text/text-input';

export type Credentials = {
	email: string;
	password: string;
};

@Component({
	selector: 'app-credentials',
	imports: [FormField, TextInputComponent, TranslateModule],
	template: `
		<div class="column-grid">
			<app-text-input #emailInput class="col-12"
				[label]="'LOGIN.EMAIL' | translate"
				[placeholder]="'LOGIN.EMAIL' | translate"
                hideRequiredIndicator
				autocomplete="email"
				trim
				type="email"
				[formField]="credentialsForm.email"/>
			<app-text-input class="col-12"
				[label]="'LOGIN.PASSWORD' | translate"
				[placeholder]="'LOGIN.PASSWORD' | translate"
                hideRequiredIndicator
				autocomplete="current-password"
				type="password"
				[formField]="credentialsForm.password"/>
		</div>
	`,
})
export class CredentialsComponent {

	private static readonly SUPABASE_MIN_PASSWORD_LENGTH = 8;
	private static readonly SUPABASE_SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/`~]/;

	private readonly emailInput = viewChild.required<TextInputComponent>('emailInput');

	private readonly credentialsModel = signal<Credentials>({
		email: '',
		password: '',
	});

	readonly credentialsForm = form(this.credentialsModel, credentials => {
		required(credentials.email, { message: 'CREDENTIALS.ERROR_MSG.EMAIL_REQUIRED' });
		email(credentials.email, { message: 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL' });
		required(credentials.password, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIRED' });
		minLength(credentials.password, CredentialsComponent.SUPABASE_MIN_PASSWORD_LENGTH, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /[a-z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /[A-Z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /\d/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, CredentialsComponent.SUPABASE_SYMBOL_REGEX, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
	});

	readonly valid = computed(() => this.credentialsForm().valid());

	getCredentials(): Credentials {
		return this.credentialsModel();
	}

	setEmailError(message: string | null) {
		this.emailInput().touched.set(true);
		this.emailInput().errors.set(message ? [{ kind: 'error', message }] : []);
	}
}


import { Component, computed, signal, viewChild } from '@angular/core';
import { FormField, email, form, minLength, pattern, required } from '@angular/forms/signals';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { TextInput } from '@/shared/form/text/text-input';

export type CredentialInfo = {
	email: string;
	password: string;
};

@Component({
	selector: 'app-credentials',
	imports: [FormField, TextInput, LocalizePipe],
	template: `
		<div class="column gap-4">
			<app-text-input #emailInput
				[placeholder]="'LOGIN.EMAIL' | localize"
                hideRequiredIndicator
				autocomplete="email"
				trim
				type="email"
				[formField]="credentialsForm.email"/>
			<app-text-input
				[placeholder]="'LOGIN.PASSWORD' | localize"
                hideRequiredIndicator
				autocomplete="current-password"
				type="password"
				[formField]="credentialsForm.password"/>
		</div>
	`,
})
export class Credentials {

	private static readonly SUPABASE_MIN_PASSWORD_LENGTH = 8;
	private static readonly SUPABASE_SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/`~]/;

	private readonly emailInput = viewChild.required<TextInput>('emailInput');

	private readonly credentialsModel = signal<CredentialInfo>({
		email: '',
		password: '',
	});

	readonly credentialsForm = form(this.credentialsModel, credentials => {
		required(credentials.email, { message: 'CREDENTIALS.ERROR_MSG.EMAIL_REQUIRED' });
		email(credentials.email, { message: 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL' });
		required(credentials.password, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIRED' });
		minLength(credentials.password, Credentials.SUPABASE_MIN_PASSWORD_LENGTH, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /[a-z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /[A-Z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, /\d/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
		pattern(credentials.password, Credentials.SUPABASE_SYMBOL_REGEX, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
	});

	readonly valid = computed(() => this.credentialsForm().valid());

	getCredentials(): CredentialInfo {
		return this.credentialsModel();
	}

	setEmailError(message: string | null) {
		this.emailInput().touched.set(true);
		this.emailInput().errors.set(message ? [{ kind: 'error', message }] : []);
	}
}


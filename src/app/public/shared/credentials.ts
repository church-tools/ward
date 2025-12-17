import { Component, computed, signal } from '@angular/core';
import { Field, email, form, required } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { TextInputComponent } from '../../shared/form/text/text-input';

export type Credentials = {
	email: string;
	password: string;
};

@Component({
	selector: 'app-credentials',
	imports: [Field, TextInputComponent, TranslateModule],
	template: `
		<div class="column-grid">
			<app-text-input class="col-12"
				[label]="'LOGIN.EMAIL' | translate"
				[placeholder]="'LOGIN.EMAIL' | translate"
                [indicateRequired]="false"
				autocomplete="email"
				[trim]="true"
				type="email"
				[field]="credentialsForm.email"/>
			<app-text-input class="col-12"
				[label]="'LOGIN.PASSWORD' | translate"
				[placeholder]="'LOGIN.PASSWORD' | translate"
                [indicateRequired]="false"
				autocomplete="current-password"
				type="password"
				[field]="credentialsForm.password"/>
		</div>
	`,
})
export class CredentialsComponent {

	private readonly credentialsModel = signal<Credentials>({
		email: '',
		password: '',
	});

	readonly credentialsForm = form(this.credentialsModel, (credentials) => {
		required(credentials.email);
		email(credentials.email);
		required(credentials.password);
	});

	readonly valid = computed(() => this.credentialsForm().valid());

	getCredentials(): Credentials {
		return this.credentialsModel();
	}
}


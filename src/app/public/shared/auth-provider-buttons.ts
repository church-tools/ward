import { AsyncButton } from '@/shared/form/button/async/async-button';
import { SupabaseService } from '@/shared/service/supabase.service';
import { wait } from '@/shared/utils/flow-control-utils';
import { TitleCasePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { LastUsedLoginBadge, setLastUsedLoginMethod } from './last-used-login-badge';

@Component({
	selector: 'app-auth-provider-buttons',
	template: `
		@for (provider of providers; track provider) {
			@let title = provider | titlecase;
			<app-async-button #btn type="secondary" size="large" class="provider-btn"
				title="Login via {{ title }}"
				[onClick]="signIn(provider)" needsInternet hideSuccess>
				<app-last-used-login-badge [method]="provider"
					[side]="$index === 0 ? 'left' : $index === providers.length - 1 ? 'right' : 'center'"/>
				@if (!btn.inProgress()) {
					<img src="assets/img/brand/{{ provider }}.svg" sizes="16x16" alt="{{ title }} Icon">
				}
			</app-async-button>
		}
	`,
	styles: [`
		app-async-button {
			position: relative;
			min-width: 6rem;

			img {
				width: 16px;
				height: 16px;
			}
		}
	`],
	imports: [AsyncButton, TitleCasePipe, LastUsedLoginBadge],
	host: { class: 'row gap-4' },
})
export class AuthProviderButtons {

	protected readonly providers = ['google', 'azure'] as const;

	private readonly supabase = inject(SupabaseService);
	
	readonly redirectTo = input<string>();
	
	signIn(provider: typeof this.providers[number]) {
		return async () => {
			setLastUsedLoginMethod(provider);
			await this.supabase.signInWithOAuth(provider, this.redirectTo());
			await wait(10000);
		};
	}
}

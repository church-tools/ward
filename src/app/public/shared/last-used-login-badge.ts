import { LocalizePipe } from '@/shared/language/localize.pipe';
import { xcomputed } from '@/shared/utils/signal-utils';
import { Component, input } from '@angular/core';

export type LoginMethod = 'password' | 'google' | 'azure';

const LAST_USED_LOGIN_METHOD_KEY = 'LAST_USED_LOGIN_METHOD';

function isLoginMethod(value: string | null): value is LoginMethod {
	return value === 'password' || value === 'google' || value === 'azure';
}

export function getLastUsedLoginMethod(): LoginMethod | null {
	const value = localStorage.getItem(LAST_USED_LOGIN_METHOD_KEY);
	return isLoginMethod(value) ? value : null;
}

export function setLastUsedLoginMethod(method: LoginMethod) {
	localStorage.setItem(LAST_USED_LOGIN_METHOD_KEY, method);
}

@Component({
	selector: 'app-last-used-login-badge',
	standalone: true,
	imports: [LocalizePipe],
	template: `
		@if (lastUsedLoginMethod === method()) {
			<div class="accent-fg tiny-text very-dense-text semibold-text inverse-font-color"
				style.translate="{{xOffset()}} 66%">
				{{ 'LOGIN.LAST_USED' | localize }}
			</div>
		}
	`,
	styles: [`
		:host {
			position: absolute;
			bottom: 0;
			pointer-events: none;
			z-index: 999;
		}

		div {
			display: inline-flex;
			padding: 0.15rem 0.45rem;
			border-radius: 999px;
		}
	`],
})
export class LastUsedLoginBadge {

	readonly method = input.required<LoginMethod>();
	readonly side = input<'right' | 'left' | 'center'>('right');
	protected readonly lastUsedLoginMethod = getLastUsedLoginMethod();

	protected readonly xOffset = xcomputed([this.side], side => {
		switch (side) {
			case 'right': return '25%';
			case 'left': return '-25%';
			case 'center': return '0';
		}
	})
}
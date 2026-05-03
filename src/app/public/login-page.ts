import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Page } from '../shared/page/page';
import { Credentials } from './shared/credentials';
import { LastUsedLoginBadge, setLastUsedLoginMethod } from './shared/last-used-login-badge';
import { AuthProviderButtons } from './shared/auth-provider-buttons';

@Component({
    selector: 'app-login-page',
    template: `
        <div class="column gap-8 items-center">
            <span class="display-text">{{ 'LOGIN.TITLE' | localize }}</span>
            <app-credentials #credentials class="max-width-96 full-width"/>
            <app-async-button type="secondary" size="large" class="third-width login-method-button"
                [title]="'LOGIN.TITLE' | localize"
                [onClick]="loginWithCredentials" needsInternet hideSuccess>
                {{ 'LOGIN.TITLE' | localize }}
                <app-last-used-login-badge method="password"/>
            </app-async-button>
            <div class="horizontal-divider with-label" role="separator" aria-label="or">
                {{ 'OR' | localize }}
            </div>
            <app-auth-provider-buttons/>
            <div class="row gap-4 mt-4">
                <app-link-button [href]="'/forgot-password'" type="transparent" hideNewTab>
                    {{ 'FORGOT_PASSWORD.TITLE' | localize }}
                </app-link-button>
                <app-link-button [href]="'/register'" type="transparent" hideNewTab>
                    {{ 'REGISTER.TITLE' | localize }}
                </app-link-button>
            </div>
        </div>
    `,
    imports: [LocalizePipe, LinkButton, AsyncButton, Credentials,
        AuthProviderButtons, LastUsedLoginBadge],
    styles: [`
        .login-method-button {
            position: relative;
            min-width: 6rem;
        }
    `],
    host: { class: 'portrait' },
})
export class LoginPage extends Page {

    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);
    private readonly functions = inject(FunctionsService);
    private readonly credentials = viewChild.required(Credentials);

    protected readonly loginWithCredentials = async () => {
        if (!this.credentials().valid())
            throw 'LOGIN.ERROR_MSG.INVALID_INPUT';
        const { email, password } = this.credentials().getCredentials();
        const result = await this.functions.call('auth/login-with-password', { email, password });
        if ('error' in result) {
            console.error('Login failed:', result.error.message);
            switch (result.error.code) {
                case 'invalid_credentials': throw 'LOGIN.ERROR_MSG.INVALID_CREDENTIALS';
                case 'email_not_confirmed': throw 'LOGIN.ERROR_MSG.EMAIL_NOT_CONFIRMED';
                default: throw 'ERROR.FAILED';
            };
        }
        const { session } = result;
        if (!session) {
            throw 'LOGIN.ERROR_MSG.INVALID_CREDENTIALS';
        }
        setLastUsedLoginMethod('password');
        await this.supabase.client.auth.setSession(session);
        await this.router.navigate(['/']);
    };
}

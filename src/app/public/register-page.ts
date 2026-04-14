import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { SupabaseService } from '@/shared/service/supabase.service';
import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Button } from "../shared/form/button/button";
import { Page } from '../shared/page/page';
import { Captcha } from './shared/captcha';
import { Credentials } from './shared/credentials';

@Component({
    selector: 'app-register-page',
    template: `
        <div class="column gap-8 items-center">
            <span class="display-text text-center">{{ 'REGISTER.TITLE' | localize }}</span>
            <app-credentials #credentials class="max-width-96 full-width"/>
            <app-captcha (onSolved)="turnstileToken = $event"/>
            <app-async-button type="primary" size="large" class="half-width"
                [onClick]="registerWithCredentials">
                {{ 'REGISTER.TITLE' | localize }}
            </app-async-button>
            <div class="horizontal-divider with-label" role="separator" aria-label="or">
                {{ 'OR' | localize }}
            </div>
            <div class="row gap-4">
                <app-button type="secondary" size="large" (onClick)="loginWithProvider('google')">
                    <img src="assets/img/brand/google.svg" sizes="16x16" alt="Google Icon" class="provider-icon">
                </app-button>
                <app-button type="secondary" size="large" (onClick)="loginWithProvider('azure')">
                    <img src="assets/img/brand/microsoft.svg" sizes="16x16" alt="Microsoft Icon" class="provider-icon">
                </app-button>
            </div>
            <div class="row gap-4 mt-4">
                <app-link-button [href]="'/reset-password'" type="transparent" hideNewTab>
                    {{ 'FORGOT_PASSWORD.TITLE' | localize }}
                </app-link-button>
                <app-link-button [href]="'/login'" type="transparent" hideNewTab>
                    {{ 'LOGIN.TITLE' | localize }}
                </app-link-button>
            </div>
        </div>
    `,
    imports: [LocalizePipe, Button, LinkButton, AsyncButton,
        Credentials, Captcha],
    styles: [`
        .provider-icon {
            width: 64px;
            height: 16px;
        }
    `],
    host: { class: 'portrait' },
})
export class RegisterPage extends Page {

    private readonly supabase = inject(SupabaseService);
    private readonly router = inject(Router);
    private readonly credentials = viewChild.required(Credentials); 

    protected turnstileToken: string | null = null;

    protected readonly registerWithCredentials = async () => {
        if (!this.credentials().valid())
            throw 'ERROR.FAILED';
        if (!this.turnstileToken)
            throw 'REGISTER.ERROR_MSG.CAPTCHA_REQUIRED';
        const { email, password } = this.credentials().getCredentials();
        const { data, error } = await this.supabase.signUp(email, password, this.turnstileToken);
        if (error) {
            switch (error.code) {
                case 'user_already_exists':
                    throw 'REGISTER.ERROR_MSG.USER_ALREADY_EXISTS';
                case 'signup_disabled':
                    throw 'REGISTER.ERROR_MSG.SIGNUP_DISABLED';
                default:
                    throw 'ERROR.FAILED';
            }
        }
        await this.router.navigate(['/confirm-email']);
    };

    protected loginWithProvider(provider: 'google' | 'azure') {
        this.supabase.signInWithOAuth(provider);
    }
}
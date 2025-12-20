import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../shared/form/button/async/async-button';
import ButtonComponent from "../shared/form/button/button";
import LinkButtonComponent from '../shared/form/button/link/link-button';
import { PageComponent } from '../shared/page/page';
import { SupabaseService } from '../shared/service/supabase.service';
import { WindowService } from '../shared/service/window.service';
import { ensureScript } from '../shared/utils/dom-utils';
import { CredentialsComponent } from './shared/credentials';

@Component({
    selector: 'app-register-page',
    template: `
        <div class="column gap-8 items-center">
            <span class="display-text">{{ 'REGISTER.TITLE' | translate }}</span>
            <app-credentials #credentials class="full-width"/>
            <div class="cf-turnstile"
                data-sitekey="0x4AAAAAACHykwNwn2RY_xJa"
                [attr.data-theme]="windowService.darkColorScheme() ? 'dark' : 'light'"
                data-size="normal"
                data-callback="onCaptchaSolved">
            </div>
            <app-async-button type="primary" size="large" class="half-width"
                [onClick]="registerWithCredentials">
                {{ 'REGISTER.TITLE' | translate }}
            </app-async-button>
            <div class="horizontal-divider" role="separator" aria-label="or">
                {{ 'OR' | translate }}
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
                <app-link-button [href]="'/reset-password'" type="transparent" [showNewTab]="false">
                    {{ 'FORGOT_PASSWORD.TITLE' | translate }}
                </app-link-button>
                <app-link-button [href]="'/login'" type="transparent" [showNewTab]="false">
                    {{ 'LOGIN.TITLE' | translate }}
                </app-link-button>
            </div>
        </div>
    `,
    imports: [TranslateModule, ButtonComponent, LinkButtonComponent, AsyncButtonComponent, CredentialsComponent],
    styles: [`
        .provider-icon {
            width: 64px;
            height: 16px;
        }
        .cf-turnstile {
            min-height: 69.5px;
        }
    `],
    host: { class: 'portrait' },
})
export class RegisterPageComponent extends PageComponent implements OnInit, OnDestroy {

    protected readonly windowService = inject(WindowService);
    private readonly supabase = inject(SupabaseService);
    private readonly router = inject(Router);
    private readonly credentials = viewChild.required(CredentialsComponent);
    private readonly document = inject(DOCUMENT);

    private cleanupCloudflareTurnstileScript?: () => void;

    private turnstileToken: string | null = null;

    public ngOnInit(): void {
        this.cleanupCloudflareTurnstileScript = ensureScript(
            this.document,
            'https://challenges.cloudflare.com/turnstile/v0/api.js',
            { async: true, defer: true },
        ).cleanup;
        (this.document as any)['onCaptchaSolved'] = (token: string) => { this.turnstileToken = token; };
    }

    public ngOnDestroy(): void {
        this.cleanupCloudflareTurnstileScript?.();
        delete (this.document as any)['onCaptchaSolved'];
    }

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
                    this.credentials().setEmailError('REGISTER.ERROR_MSG.EMAIL_IN_USE');
                    throw 'ERROR.FAILED';
                case 'signup_disabled':
                    throw 'REGISTER.ERROR_MSG.SIGNUP_DISABLED';
                default:
                    throw 'ERROR.FAILED';
            }
        }
        if (!data.session) {
            throw 'REGISTER.ERROR_MSG.EMAIL_CONFIRMATION_REQUIRED';
        }
        await this.router.navigate(['/confirm-email']);
    };

    protected loginWithProvider(provider: 'google' | 'azure') {
        this.supabase.signInWithOAuth(provider);
    }
}
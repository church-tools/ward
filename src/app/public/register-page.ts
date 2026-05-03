import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Page } from '../shared/page/page';
import { AuthProviderButtons } from "./shared/auth-provider-buttons";
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
                [onClick]="registerWithPassword">
                {{ 'REGISTER.TITLE' | localize }}
            </app-async-button>
            <div class="horizontal-divider with-label" role="separator" aria-label="or">
                {{ 'OR' | localize }}
            </div>
            <app-auth-provider-buttons/>
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
    imports: [LocalizePipe, LinkButton, AsyncButton,
    Credentials, Captcha, AuthProviderButtons],
    host: { class: 'portrait' },
})
export class RegisterPage extends Page {

    private readonly functions = inject(FunctionsService);
    private readonly language = inject(LanguageService);
    private readonly router = inject(Router);
    private readonly credentials = viewChild.required(Credentials); 

    protected turnstileToken: string | null = null;

    protected readonly registerWithPassword = async () => {
        if (!this.credentials().valid())
            throw 'ERROR.FAILED';
        if (!this.turnstileToken)
            throw 'REGISTER.ERROR_MSG.CAPTCHA_REQUIRED';
        const { email, password } = this.credentials().getCredentials();
        try {
            await this.functions.call('auth/register-with-password', {
                email, password,
                captchaToken: this.turnstileToken,
                language: this.language.current(),
            });
        } catch (err: any) {
            if (typeof err?.message === 'string') {
                if (err.message.includes('user_already_exists'))
                    throw 'REGISTER.ERROR_MSG.USER_ALREADY_EXISTS';
                if (err.message.includes('captcha invalid'))
                    throw 'REGISTER.ERROR_MSG.CAPTCHA_REQUIRED';
            }
            throw 'ERROR.FAILED';
        }
        await this.router.navigate(['/confirm-email']);
    };
}
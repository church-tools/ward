import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { TextInput } from '@/shared/form/text/text-input';
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { FunctionsService } from '@/shared/service/functions.service';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { Page } from '../shared/page/page';
import { Captcha } from './shared/captcha';

@Component({
    selector: 'app-reset-password-page',
    template: `
        <div class="column gap-6 items-center">
            <span class="display-text text-center">{{ 'FORGOT_PASSWORD.TITLE' | localize }}</span>
            <p class="text-center">{{ 'FORGOT_PASSWORD.REQUEST_MESSAGE' | localize }}</p>
            <div class="column-grid full-width max-width-96">
                <app-text-input class="col-12"
                    [label]="'LOGIN.EMAIL' | localize"
                    [placeholder]="'LOGIN.EMAIL' | localize"
                    type="email"
                    [formField]="requestForm"/>
            </div>
            <app-captcha (onSolved)="turnstileToken = $event"/>
            <app-async-button class="half-width" type="primary" size="large" [onClick]="requestReset">
                {{ 'FORGOT_PASSWORD.SEND_LINK' | localize }}
            </app-async-button>
            <app-link-button [href]="'/login'" type="transparent" hideNewTab>
                {{ 'LOGIN.TITLE' | localize }}
            </app-link-button>
        </div>
    `,
    imports: [AsyncButton, Captcha, FormField, LinkButton, LocalizePipe, TextInput],
    host: { class: 'page portrait' },
})
export class ForgotPasswordPage extends Page {

    private readonly functions = inject(FunctionsService);
    private readonly languageService = inject(LanguageService);

    protected readonly requestEmail = signal('');
    protected readonly newPassword = signal('');
    protected readonly isRecoveryMode = signal(false);
    protected turnstileToken: string | null = null;

    readonly requestForm = form(this.requestEmail, f => {
        required(f, { message: 'CREDENTIALS.ERROR_MSG.EMAIL_REQUIRED' });
        email(f, { message: 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL' });
    });

    constructor() {
        super();
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hasRecoveryToken = hash.get('type') === 'recovery' || hash.has('access_token');
        this.isRecoveryMode.set(hasRecoveryToken);
    }

    protected readonly requestReset = async () => {
        if (!this.requestForm().valid())
            throw 'CREDENTIALS.ERROR_MSG.INVALID_EMAIL';
        if (!this.turnstileToken)
            throw 'CREDENTIALS.ERROR_MSG.CAPTCHA_REQUIRED';
        try {
            await this.functions.call('auth/send-password-reset-email', {
                email: this.requestEmail(),
                captchaToken: this.turnstileToken,
                language: this.languageService.current(),
            });
        } catch (err: any) {
            if (typeof err?.message === 'string' && err.message.includes('captcha invalid'))
                throw 'CREDENTIALS.ERROR_MSG.CAPTCHA_REQUIRED';
            throw 'ERROR.FAILED';
        }
        throw 'RESET_PASSWORD.LINK_SENT';
    }
}

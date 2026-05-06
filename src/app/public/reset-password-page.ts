import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { TextInput } from '@/shared/form/text/text-input';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from '@/shared/service/supabase.service';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, minLength, pattern, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Page } from '../shared/page/page';

@Component({
    selector: 'app-reset-password-page',
    template: `
        <div class="column gap-6 items-center">
            <span class="display-text text-center">{{ 'RESET_PASSWORD.TITLE' | localize }}</span>
            <p class="text-center">{{ 'RESET_PASSWORD.SET_NEW_MESSAGE' | localize }}</p>
            <div class="column-grid full-width max-width-96">
                <app-text-input class="col-12"
                    [placeholder]="'RESET_PASSWORD.NEW_PASSWORD' | localize"
                    type="password"
                    [formField]="passwordForm"/>
            </div>
            <app-async-button class="half-width" type="primary" size="large" [onClick]="setNewPassword">
                {{ 'RESET_PASSWORD.SET_PASSWORD' | localize }}
            </app-async-button>
            <app-link-button [href]="'/login'" type="transparent" hideNewTab>
                {{ 'LOGIN.TITLE' | localize }}
            </app-link-button>
        </div>
    `,
    imports: [AsyncButton, FormField, LinkButton, LocalizePipe, TextInput],
    host: { class: 'page portrait' },
})
export class ResetPasswordPage extends Page {

    private readonly supabase = inject(SupabaseService);
    private readonly router = inject(Router);

    protected readonly requestEmail = signal('');
    protected readonly newPassword = signal('');


    readonly passwordForm = form(this.newPassword, f => {
        required(f, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIRED' });
        minLength(f, 8, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
        pattern(f, /[a-z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
        pattern(f, /[A-Z]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
        pattern(f, /\d/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
        pattern(f, /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/~`]/, { message: 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS' });
    });

    protected readonly setNewPassword = async () => {
        if (!this.passwordForm().valid())
            throw 'CREDENTIALS.ERROR_MSG.PASSWORD_REQUIREMENTS';

        const { error } = await this.supabase.client.auth.updateUser({ password: this.newPassword() });
        if (error)
            throw 'ERROR.FAILED';

        await this.router.navigate(['/login']);
    }
}

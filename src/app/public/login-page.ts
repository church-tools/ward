import { Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../shared/form/button/async/async-button';
import ButtonComponent from "../shared/form/button/button";
import LinkButtonComponent from '../shared/form/button/link/link-button';
import { PageComponent } from '../shared/page/page';
import { FunctionsService } from '../shared/service/functions.service';
import { SupabaseService } from '../shared/service/supabase.service';
import { CredentialsComponent } from './shared/credentials';

@Component({
    selector: 'app-login-page',
    template: `
        <div class="column gap-8 items-center">
            <span class="display-text">{{ 'LOGIN.TITLE' | translate }}</span>
            <app-credentials #credentials class="full-width"/>
            <app-async-button type="primary" size="large" class="third-width"
                [onClick]="loginWithCredentials">
                {{ 'LOGIN.TITLE' | translate }}
            </app-async-button>
            <div class="horizontal-divider with-label" role="separator" aria-label="or">
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
                <app-link-button [href]="'/register'" type="transparent" [showNewTab]="false">
                    {{ 'REGISTER.TITLE' | translate }}
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
    `],
    host: { class: 'portrait' },
})
export class LoginPageComponent extends PageComponent {

    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);
    private readonly functions = inject(FunctionsService);
    private readonly credentials = viewChild.required(CredentialsComponent);

    protected readonly loginWithCredentials = async () => {
        if (!this.credentials().valid())
            throw 'LOGIN.ERROR_MSG.INVALID_INPUT';
        const { email, password } = this.credentials().getCredentials();
        const { session, error } = await this.functions.loginWithPassword(email, password);
        if (error) {
            console.error('Login failed:', error.message);
            switch (error.code) {
                case 'invalid_credentials': throw 'LOGIN.ERROR_MSG.INVALID_CREDENTIALS';
                case 'email_not_confirmed': throw 'LOGIN.ERROR_MSG.EMAIL_NOT_CONFIRMED';
                default: throw 'ERROR.FAILED';
            };
        }
        if (!session) {
            throw 'LOGIN.ERROR_MSG.INVALID_CREDENTIALS';
        }
        await this.supabase.client.auth.setSession(session);
        await this.router.navigate(['/']);
    };

    protected loginWithProvider(provider: 'google' | 'azure') {
        this.supabase.signInWithOAuth(provider);
    }
}
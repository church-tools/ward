import { Component, inject, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../shared/form/button/async/async-button';
import ButtonComponent from "../shared/form/button/button";
import { PageComponent } from '../shared/page/page';
import { SupabaseService } from '../shared/service/supabase.service';
import { CredentialsComponent } from './shared/credentials';
import LinkButtonComponent from '../shared/form/button/link/link-button';

@Component({
    selector: 'app-login-page',
    template: `
        <span class="display-text">Login</span>
        <div class="column gap-8 items-center">
            <app-credentials #credentials class="full-width"/>
            <app-async-button type="primary" size="large" class="third-width"
                [onClick]="loginWithCredentials">
                {{ 'LOGIN.TITLE' | translate }}
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

    private readonly supabaseService = inject(SupabaseService);
    private readonly credentials = viewChild.required(CredentialsComponent);

    protected readonly loginWithCredentials = async () => {
        if (!this.credentials().valid()) {
            throw 'LOGIN.ERROR_MSG.INVALID_INPUT';
        }
        const { email, password } = this.credentials().getCredentials();
        const { errorCode } = await this.supabaseService.signIn(email, password);
        switch (errorCode) {
            case 'invalid_credentials': throw 'LOGIN.ERROR_MSG.INVALID_CREDENTIALS';
            case 'email_not_confirmed': throw 'LOGIN.ERROR_MSG.EMAIL_NOT_CONFIRMED';
        };
    };

    protected loginWithProvider(provider: 'google' | 'azure') {
        this.supabaseService.signInWithOAuth(provider);
    }
}
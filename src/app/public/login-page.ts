import { Component, inject } from '@angular/core';
import ButtonComponent from "../shared/form/button/button";
import { PageComponent } from '../shared/page/page';
import { SupabaseService } from '../shared/service/supabase.service';

@Component({
    selector: 'app-login-page',
    template: `
        <span class="display-text">Login</span>
        <p>Login component content goes here.</p>
        <div class="column-grid">
            
        </div>
        <div class="column-grid">
            <app-button class="col-6" type="secondary" size="large" (onClick)="loginWithProvider('google')">
                <img src="assets/img/brand/google.svg" sizes="16x16" alt="Google Icon" class="icon">
            </app-button>
            <app-button class="col-6" type="secondary" size="large" (onClick)="loginWithProvider('azure')">
                <img src="assets/img/brand/microsoft.svg" sizes="16x16" alt="Microsoft Icon" class="icon">
            </app-button>
        </div>
    `,
    imports: [ButtonComponent],
    styles: [`
        .icon {
            width: 16px;
            height: 16px;
        }
    `],
})
export class LoginPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    constructor() {
        super();
    }

    protected loginWithProvider(provider: 'google' | 'azure') {
        this.supabaseService.signInWithOAuth(provider);
    }

}
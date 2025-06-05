import { Component, inject } from '@angular/core';
import { SupabaseService } from '../../shared/supabase.service';
import { PageComponent } from '../shared/page';

@Component({
    selector: 'app-login-page',
    template: `
        <span class="display-text">Login</span>
        <p>Login component content goes here.</p>
        <button (click)="loginWithProvider('google')">Login with Google</button>
        <button (click)="loginWithProvider('azure')">Login with Microsoft</button>

    `,
})
export class LoginPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    constructor() {
        super();
    }

    protected loginWithProvider(provider: 'google' | 'azure'): void {
        this.supabaseService.signInWithOAuth(provider);
    }

}
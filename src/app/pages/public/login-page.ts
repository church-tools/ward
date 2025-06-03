import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from '../shared/page';

@Component({
    selector: 'app-login-page',
    template: `
        <span class="display-text">Login</span>
        <p>Login component content goes here.</p>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent extends PageComponent {

    constructor() {
        super();
    }

}
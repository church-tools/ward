import { Component } from '@angular/core';
import { PageComponent } from '../shared/page/page';
import LinkButtonComponent from '../shared/form/button/link/link-button';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">404 Not Found</span>
        <p>Diese Seite existiert (noch?) nicht</p>
        <app-link-button [href]="'/'">
            Zur Startseite
        </app-link-button>
    `,
    imports: [LinkButtonComponent],
    host: { class: 'page narrow' },
})
export class NotFoundPageComponent extends PageComponent {

}
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '../../../shared/icon/icon';

@Component({
    selector: 'app-back-button',
    template: `
        <a class="back-area button subtle-with-gap" [routerLink]="url()">
            <app-icon icon="arrow_left" size="sm"/>
        </a>
        `,
    imports: [RouterModule, TranslateModule, IconComponent],
    host: { 'animate.leave': 'leave' },
    styleUrl: './back-button.scss',
})
export class BackButtonComponent {

    readonly url = input.required<string>();
    
}
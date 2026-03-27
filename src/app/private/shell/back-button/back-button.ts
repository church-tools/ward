import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Icon } from '@/shared/icon/icon';

@Component({
    selector: 'app-back-button',
    template: `
        <a class="back-area button medium subtle-with-gap" [routerLink]="url()">
            <app-icon icon="arrow_left" size="sm"/>
        </a>
        `,
    imports: [RouterModule, TranslateModule, Icon],
    host: { 'animate.leave': 'leave' },
    styleUrl: './back-button.scss',
})
export class BackButton {

    readonly url = input.required<string>();
    
}
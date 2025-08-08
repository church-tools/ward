import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import LinkButtonComponent from '../../shared/form/button/link/link-button';
import { IconComponent } from '../../shared/icon/icon';
import { privateTabs } from '../private.routes';

@Component({
    selector: 'app-back-button',
    template: `
        <app-link-button type="subtle" size="small"
            href="/{{url}}" [showNewTab]="false">
            <span class="row items-center translucent-text">
                <app-icon icon="chevron_left" iconSize="sm"/>
                {{ 'NAV_BAR_TAB.' + this.translateId | translate }}
            </span>
        </app-link-button>
        `,
    imports: [TranslateModule, LinkButtonComponent, IconComponent],
    styles: [`
        @use "font";
        :host {
            position: absolute;
            margin-left: -1.25rem;
            margin-top: -1.5rem;
            &:hover .translucent-text {
                color: font.$color !important;
            }
        }
    `]
})
export class BackButtonComponent {

    private readonly route = inject(ActivatedRoute);

    protected readonly url: string;
    protected readonly translateId: string;

    constructor() {
        this.url = this.route.snapshot.url[0].path;
        this.translateId = privateTabs[this.url]?.translateId || 'Back';
    }
    
}
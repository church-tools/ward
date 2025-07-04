import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import LinkButtonComponent from '../../shared/form/button/link/link-button';
import { privateTabs } from '../private.routes';
import { IconComponent } from '../../shared/icon/icon';
import WindowService from '../../shared/window.service';

@Component({
    selector: 'app-back-button',
    template: `
        @if (!windowService.isSmall()) {
            <app-link-button type="subtle" size="small"
                href="/{{url}}" [showNewTab]="false">
                <span class="row items-center translucent-text">
                    <app-icon icon="chevron_left" iconSize="sm"/>
                    {{ this.title }}
                </span>
            </app-link-button>
        }
        `,
    imports: [LinkButtonComponent, IconComponent],
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
    protected readonly windowService = inject(WindowService);

    protected readonly url: string;
    protected readonly title: string;

    constructor() {
        this.url = this.route.snapshot.url[0].path;
        this.title = privateTabs[this.url]?.label || 'Back';
    }
    
}
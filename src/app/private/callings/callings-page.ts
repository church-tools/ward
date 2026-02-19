import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { OrganizationViewService } from '../../modules/organization/organization-view.service';
import { IconComponent } from "../../shared/icon/icon";
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-callings-page',
    template: `
        <span class="h0">{{ 'CALLINGS_PAGE.TITLE' | translate }}</span>
        <a class="stealth card canvas-card selectable-card" routerLink="/callings/organizations">
            <div class="row no-wrap items-center m-6-8">
                <h3 class="grow-1">
                    <app-icon [icon]="organizationView.icon" [filled]="true"/>
                    <span class="overflow-ellipsis">{{ 'ORGANIZATIONS_PAGE.TITLE' | translate }}</span>
                </h3>
                <app-icon class="ms-auto" icon="chevron_right"/>
            </div>
        </a>
        <p>Callings component content goes here.</p>
    `,
    imports: [TranslateModule, RouterModule, IconComponent],
    host: { class: 'page narrow' },
})
export class CallingsPageComponent extends PrivatePageComponent {

    protected readonly organizationView = inject(OrganizationViewService);
    
    constructor() {
        super();
    }

}
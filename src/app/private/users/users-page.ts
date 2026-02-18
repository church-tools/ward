import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Profile } from '../../modules/profile/profile';
import { RowCardListComponent } from "../../modules/shared/row-card-list/row-card-list";
import { Table } from '../../modules/shared/table.types';
import { PrivatePageComponent } from '../shared/private-page';
import { RouterOutletDrawerComponent } from "../shared/router-outlet-drawer/router-outlet-drawer";
import { NewUnitsComponent } from "./new-units";

@Component({
    selector: 'app-users-page',
    template: `
        <app-router-outlet-drawer
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'USERS_PAGE.TITLE' | translate }}</span>
                <app-row-card-list
                    tableName="profile"
                    [editable]="true"
                    [getQuery]="getQuery"
                    [page]="this"
                    [getUrl]="getUrl"
                    [activeId]="activeProfileId()"/>
                @if (adminService.isAdmin()) {
                    <app-new-units/>
                }
            </div>
        </app-router-outlet-drawer>
    `,
    imports: [TranslateModule, RowCardListComponent,
        RouterOutletDrawerComponent, NewUnitsComponent],
    host: { class: 'full-width' },
})
export class UsersPageComponent extends PrivatePageComponent {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeProfileId = signal<number | null>(null);
    
    protected getUrl = (profile: Profile.Row | null) => `/users/${profile?.id ?? ""}`;

    protected getQuery = {
        query: (table: Table<'profile'>) => table.find().not('unit_approved', false),
        id: 'users',
    };

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    protected onActivate(id: string | null) {
        this.activeProfileId.set(id ? +id : null);
    }
}
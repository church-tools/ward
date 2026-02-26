import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Profile } from '../../modules/profile/profile';
import { ProfileListInsertComponent } from '../../modules/profile/profile-list-insert';
import { ProfileListRowComponent } from '../../modules/profile/profile-list-row';
import { RowCardListComponent } from "../../modules/shared/row-card-list/row-card-list";
import { Table } from '../../modules/shared/table.types';
import { PrivatePageComponent } from '../shared/private-page';
import { DrawerRouterOutletComponent } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { NewUnitsComponent } from "./new-units";

@Component({
    selector: 'app-users-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'USERS_PAGE.TITLE' | translate }}</span>
                <app-row-card-list
                    tableName="profile"
                    editable
                    [getQuery]="getQuery"
                    [page]="this"
                    [getUrl]="getUrl"
                    [activeId]="activeProfileId()">
                    <ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
                        <app-profile-list-row [row]="row" [page]="page" [onRemove]="onRemove"/>
                    </ng-template>
                    <ng-template #insertTemplate let-functions let-prepareInsert="prepareInsert" let-context="context">
                        <app-profile-list-insert
                            [insert]="functions.insert"
                            [cancel]="functions.cancel"
                            [prepareInsert]="prepareInsert"
                            [context]="context"/>
                    </ng-template>
                </app-row-card-list>
                @if (adminService.isAdmin()) {
                    <app-new-units/>
                }
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [TranslateModule, RowCardListComponent, ProfileListRowComponent, ProfileListInsertComponent,
        DrawerRouterOutletComponent, NewUnitsComponent],
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
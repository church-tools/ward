import { Profile } from '@/modules/profile/profile';
import { ProfileListInsert } from '@/modules/profile/profile-list-insert';
import { ProfileListRow } from '@/modules/profile/profile-list-row';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table } from '@/modules/shared/table.types';
import { Icon } from '@/shared/icon/icon';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { HoverNudgeDirective } from '@/shared/utils/hover-nudge.directive';
import { ActiveIndicator } from '@/shared/widget/active-indicator/active-indicator';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DrawerRouterOutlet } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePage } from '../shared/private-page';
import { NewUnits } from "./new-units";

@Component({
    selector: 'app-users-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-8">
                <span class="h0">{{ 'USERS_PAGE.TITLE' | localize }}</span>
                <div class="row">
                    <a class="card grow-1 stealth canvas-card suppress-canvas-card-animation selectable-card"
                        style="position: relative;"
                        appHoverNudge [hoverNudgeDistance]="1"
                        routerLink="/users/create-join-link"
                        [routerLinkActive]="[]"
                        [routerLinkActiveOptions]="{ exact: true }"
                        #activeLink="routerLinkActive"
                        (click)="activeLink.isActive ? null :$event.stopPropagation()">
                        @if (activeLink.isActive) {
                            <app-active-indicator/>
                        }
                        <div class="row no-wrap items-center m-4">
                            <h4 class="grow-1">
                                <app-icon icon="link" class="subtle-text"/>
                                <span>{{ 'CREATE_JOIN_LINK.TITLE' | localize }}</span>
                            </h4>
                        </div>
                    </a>
                </div>
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
    imports: [LocalizePipe, RowCardList, ProfileListRow, ProfileListInsert,
        DrawerRouterOutlet, NewUnits, RouterLink, RouterLinkActive,
        HoverNudgeDirective, Icon, ActiveIndicator],
    host: { class: 'full-width' },
})
export class UsersPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly activeProfileId = signal<number | null>(null);
    
    protected getUrl = (profile: Profile.Row | null) => `/users/${profile?.id ?? ""}`;

    protected getQuery = {
        query: (table: Table<'profile'>) => table.find().not('unit_approved', false),
        id: 'users',
    };

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected onActivate(id: string | null) {
        const parsedId = id ? Number(id) : null;
        this.activeProfileId.set(parsedId !== null && Number.isFinite(parsedId) ? parsedId : null);
    }
}
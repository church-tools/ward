import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Organization } from '../../../modules/organization/organization';
import { ProfileService } from '../../../modules/profile/profile.service';
import { RowCardListComponent } from "../../../modules/shared/row-card-list/row-card-list";
import { Table } from '../../../modules/shared/table.types';
import AsyncButtonComponent from '../../../shared/form/button/async/async-button';
import { SupabaseService } from '../../../shared/service/supabase.service';
import { getRowRoute } from '../../private.routes';
import { DrawerRouterOutletComponent } from "../../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePageComponent } from '../../shared/private-page';

@Component({
    selector: 'app-organizations-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateHere()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'ORGANIZATIONS_PAGE.TITLE' | translate }}</span>
                <app-row-card-list #organizationList
                    tableName="organization"
                    [getQuery]="getQuery"
                    [editable]="adminService.editMode()"
                    [page]="this"
                    [getUrl]="getUrl"
                    [activeId]="activeOrganizationId()"/>
                @if (adminService.isUnitAdmin() && !adminService.editMode() && organizationList.initialized() && organizationList.rowCount() === 0) {
                    <div class="card canvas-card large card-appear row p-4">
                        <app-async-button icon="edit" size="large"
                            [onClick]="enableEditMode">
                            {{ 'ENABLE_EDIT_MODE' | translate }}
                        </app-async-button>
                    </div> 
                }
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [TranslateModule, RowCardListComponent, DrawerRouterOutletComponent, AsyncButtonComponent],
    host: { class: 'full-width' },
})
export class OrganizationsPageComponent extends PrivatePageComponent {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly profileService = inject(ProfileService);
    private readonly supabase = inject(SupabaseService);

    protected readonly activeOrganizationId = signal<number | null>(null);
    
    protected readonly getQuery = {
        query: (table: Table<'organization'>) => table.readAll(),
        id: 'organizations'
    };
        
    protected getUrl = (organization: Organization.Row | null) =>  organization
        ? getRowRoute({ table: 'organization', row: organization })
        : '/organizations';

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    protected onActivate(id: string | null) {
        this.activeOrganizationId.set(id ? +id : null);
    }
    
    protected enableEditMode = async () => {
        const profile = await this.profileService.own.asPromise();
        const names = ['Elders Quorum', 'Relief Society'];
        const organizationTable = this.supabase.sync.from('organization');
        await organizationTable.insert(names.map((name, position) =>
            <Organization.Insert>{ name, position, unit: profile.unit, color: 'red' }));
        this.adminService.editMode.set(true);
    }
}
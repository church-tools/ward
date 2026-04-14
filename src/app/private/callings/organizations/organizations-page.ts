import type { Organization } from '@/modules/organization/organization';
import { OrganizationListInsert } from '@/modules/organization/organization-list-insert';
import { OrganizationListRow } from '@/modules/organization/organization-list-row';
import { ProfileService } from '@/modules/profile/profile.service';
import { RowCardList } from "@/modules/shared/row-card-list/row-card-list";
import { Table } from '@/modules/shared/table.types';
import { getRowRoute } from '@/private/private.routes';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import LinkButton from '@/shared/form/button/link/link-button';
import { Icon } from "@/shared/icon/icon";
import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupabaseService } from '@/shared/service/supabase.service';
import Collapse from '@/shared/widget/collapse/collapse';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerRouterOutlet } from "../../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePage } from '../../shared/private-page';
import { OrganizationCallings } from './organization-callings';

@Component({
    selector: 'app-organizations-page',
    templateUrl: './organizations-page.html',
    imports: [LocalizePipe, RowCardList, OrganizationListRow, OrganizationListInsert,
        DrawerRouterOutlet, AsyncButton, LinkButton, Collapse, Icon, OrganizationCallings],
    styleUrl: './organizations-page.scss',
    host: { class: 'full-width' },
})
export class OrganizationsPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly profileService = inject(ProfileService);
    private readonly supabase = inject(SupabaseService);
    private readonly language = inject(LanguageService);

    protected readonly activeOrganizationId = signal<number | null>(null);
    protected readonly rowClickCallback = signal<((org: Organization.Row) => void) | undefined>(undefined);
    
    protected readonly getQuery = {
        query: (table: Table<'organization'>) => table.readAll(),
        id: 'organizations',
    };

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

    protected onActivate(id: string | null) {
        this.activeOrganizationId.set(id ? +id : null);
    }

    protected getCollapseToggleFn(collapse: Collapse) {
        return (_: Organization.Row) => collapse.toggle();
    }

    protected getSettingsUrl = (org: Organization.Row) => getRowRoute({ table: 'organization', row: org })

    protected enableEditMode = async () => {
        const profile = await this.profileService.own.asPromise();
        const organizationTable = this.supabase.sync.from('organization');
        const infos: Omit<Organization.Insert, 'id' | 'unit' | 'position' | 'name'>[] = [
            { type: 'bishopric', color: 'goldenrod' },
            { type: 'elders_quorum', color: 'chocolate' },
            { type: 'relief_society', color: 'royalblue' },
            { type: 'sunday_school', color: 'indigo' },
            { type: 'young_men', color: 'tomato' },
            { type: 'young_women', color: 'deeppink' },
            { type: 'primary', color: 'lawngreen' }
        ];
        const localizer = await this.language.getLocalizer();
        await organizationTable.insert(infos.map(({ type, color }, position) => <Organization.Insert>{
            type, color, position, unit: profile.unit,
            name: localizer(`ORGANIZATION_TYPE.${type!.toUpperCase()}.NAME`),
            abbreviation: localizer(`ORGANIZATION_TYPE.${type!.toUpperCase()}.SHORT`),
        }));
        this.adminService.editMode.set(true);
    }
}
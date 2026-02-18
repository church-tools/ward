import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Agenda } from '../../modules/agenda/agenda';
import { AgendaItem } from '../../modules/item/agenda-item';
import { ProfileService } from '../../modules/profile/profile.service';
import { RowCardListComponent } from '../../modules/shared/row-card-list/row-card-list';
import { Table } from '../../modules/shared/table.types';
import { xcomputed } from '../../shared/utils/signal-utils';
import { DrawerRouterOutletComponent } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePageComponent } from '../shared/private-page';
import { getRowRoute } from '../private.routes';

@Component({
    selector: 'app-meetings-page',
    template: `
        <app-drawer-router-outlet
            (onClose)="navigateToThis()"
            (activated)="onActivate($event)">
            <div class="page narrow gap-4">
                <span class="h0">{{ 'MEETINGS_PAGE.MY_TASKS' | translate }}</span>
                <app-row-card-list tableName="agenda_item"
                    [getQuery]="getMyTaskQuery()"
                    [getUrl]="getItemUrl"
                    [activeId]="activeItemId()"
                    emptyIcon="checkmark_circle"/>
                <span class="h0 mt-4">{{ 'MEETINGS_PAGE.TITLE' | translate }}</span>
                <app-row-card-list
                    tableName="agenda"
                    [getQuery]="getAgendaQuery"
                    [page]="this"
                    [editable]="adminService.editMode()"
                    [gap]="4"
                    [getUrl]="getAgendaUrl"/>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [TranslateModule, RowCardListComponent, RowCardListComponent, DrawerRouterOutletComponent],
    host: { class: 'full-width' },
})
export class MeetingsPageComponent extends PrivatePageComponent {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly profileService = inject(ProfileService);

    protected readonly activeItemId = signal<number | null>(null);

    protected readonly getMyTaskQuery = xcomputed([this.profileService.own],
        own => own
        ? { query: (table: Table<'agenda_item'>) => table.find()
            .contains('assigned_to', own.id)
            .eq('type', 'task'), id: `my_tasks_${own.id}` }
        : null);

    protected readonly getAgendaQuery = { query: (table: Table<'agenda'>) => table.readAll(), id: 'agendas' };
    
    protected getItemUrl = (item: AgendaItem.Row | null) => item
        ? `/meetings/${item.id}`
        : "/meetings";

    protected getAgendaUrl = (agenda: Agenda.Row | null) => agenda
        ? getRowRoute({ table: 'agenda', row: agenda })
        : "meetings";

    protected navigateToThis() {
        this.router.navigate([`meetings`]);
    }

    protected onActivate(id: string | null) {
        this.activeItemId.set(id ? +id : null);
    }

}
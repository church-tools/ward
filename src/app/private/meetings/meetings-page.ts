import { Agenda } from '@/modules/agenda/agenda';
import { AgendaListInsert } from '@/modules/agenda/agenda-list-insert';
import { AgendaListRow } from '@/modules/agenda/agenda-list-row';
import { AgendaItem } from '@/modules/item/agenda-item';
import { AgendaItemListInsert } from '@/modules/item/agenda-item-list-insert';
import { AgendaItemListRow } from '@/modules/item/agenda-item-list-row';
import { ProfileService } from '@/modules/profile/profile.service';
import { RowCardList } from '@/modules/shared/row-card-list/row-card-list';
import { Table } from '@/modules/shared/table.types';
import { xcomputed } from '@/shared/utils/signal-utils';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { getRowRoute } from '../private.routes';
import { DrawerRouterOutlet } from "../shared/drawer-router-outlet/drawer-router-outlet";
import { PrivatePage } from '../shared/private-page';

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
                    emptyIcon="checkmark_circle">
                    <ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
                        <app-agenda-item-list-row [row]="row" [page]="page" [onRemove]="onRemove"/>
                    </ng-template>
                    <ng-template #insertTemplate let-functions let-prepareInsert="prepareInsert" let-context="context">
                        <app-agenda-item-list-insert
                            [insert]="functions.insert"
                            [cancel]="functions.cancel"
                            [prepareInsert]="prepareInsert"
                            [context]="context"/>
                    </ng-template>
                </app-row-card-list>
                <span class="h0 mt-4">{{ 'MEETINGS_PAGE.TITLE' | translate }}</span>
                <app-row-card-list
                    tableName="agenda"
                    [getQuery]="getAgendaQuery"
                    [page]="this"
                    [editable]="adminService.editMode()"
                    [gap]="4"
                    [getUrl]="getAgendaUrl">
                    <ng-template #rowTemplate let-row let-page="page" let-onRemove="onRemove">
                        <app-agenda-list-row [row]="row" [page]="page" [onRemove]="onRemove"/>
                    </ng-template>
                    <ng-template #insertTemplate let-functions let-prepareInsert="prepareInsert" let-context="context">
                        <app-agenda-list-insert
                            [insert]="functions.insert"
                            [cancel]="functions.cancel"
                            [prepareInsert]="prepareInsert"
                            [context]="context"/>
                    </ng-template>
                </app-row-card-list>
            </div>
        </app-drawer-router-outlet>
    `,
    imports: [TranslateModule, RowCardList, AgendaItemListRow, AgendaItemListInsert,
        AgendaListRow, AgendaListInsert, DrawerRouterOutlet],
    host: { class: 'full-width' },
})
export class MeetingsPage extends PrivatePage {

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
        ? getRowRoute({ table: 'agenda_item', row: item, currentPage: 'MeetingsPage' })
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
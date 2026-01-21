import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Agenda } from '../../modules/agenda/agenda';
import { AgendaItem } from '../../modules/item/agenda-item';
import { ProfileService } from '../../modules/profile/profile.service';
import { RowCardListComponent } from '../../modules/shared/row-card-list';
import { Table } from '../../modules/shared/table.types';
import { SupabaseService } from '../../shared/service/supabase.service';
import { xcomputed } from '../../shared/utils/signal-utils';
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0">{{ 'MEETINGS_PAGE.MY_TASKS' | translate }}</span>
        <app-row-card-list tableName="agenda_item"
            [getQuery]="getMyTaskQuery()"
            [getUrl]="getItemUrl"
            [activeId]="activeItemId()"/>

        <span class="h0">{{ 'MEETINGS_PAGE.TITLE' | translate }}</span>
        <app-row-card-list
            tableName="agenda"
            [getQuery]="getAgendaQuery"
            [page]="this"
            [editable]="adminService.editMode()"
            [gap]="4"
            [getUrl]="getAgendaUrl"/>
    `,
    imports: [TranslateModule, RowCardListComponent, RowCardListComponent],
    host: { class: 'page narrow' },
})
export class MeetingsPageComponent extends PrivatePageComponent {

    private readonly supabase = inject(SupabaseService);
    private readonly profileService = inject(ProfileService);

    protected readonly activeItemId = signal<number | null>(null);

    protected readonly getMyTaskQuery = xcomputed([this.profileService.own],
        own => own
        ? (table: Table<'agenda_item'>) => table.find()
            .contains('assigned_to', own.id)
            .eq('type', 'task')
        : null);
    
    protected getItemUrl = (item: AgendaItem.Row | null) => `/meetings/task/${item?.id ?? ""}`;

    protected getAgendaQuery = (table: Table<'agenda'>) => table.readAll();

    protected getAgendaUrl = (agenda: Agenda.Row | null) => `/meetings/${agenda?.id ?? ""}`;

}
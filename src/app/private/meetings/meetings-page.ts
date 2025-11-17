import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Agenda } from '../../modules/agenda/agenda';
import { RowCardListComponent } from '../../modules/shared/row-card-list';
import { Table } from '../../modules/shared/table.types';
import { SupabaseService } from '../../shared/service/supabase.service';
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0">{{ 'MEETINGS_PAGE.TITLE' | translate }}</span>
        <app-row-card-list
            tableName="agenda"
            [getQuery]="getQuery"
            [page]="this"
            [editable]="adminService.editMode()"
            [gap]="4"
            [getUrl]="getUrl"/>
    `,
    imports: [TranslateModule, RowCardListComponent],
    host: { class: 'page narrow' },
})
export class MeetingsPageComponent extends PrivatePageComponent {

    private readonly supabase = inject(SupabaseService);

    protected getQuery = (table: Table<'agenda'>) => table.readAll();

    protected addAgenda = async () => {
        await this.supabase.sync.from('agenda').insert({ name: "", unit: 18 } as Agenda.Insert);
    }

    protected async updateAgendas(agendas: Agenda.Row[]) {
        await this.supabase.sync.from('agenda').update(agendas);
    }

    protected getUrl = (agenda: Agenda.Row | null) => `/meetings/${agenda?.id ?? ""}`;
}
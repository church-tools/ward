import { Component, inject } from '@angular/core';
import { Agenda } from '../../modules/agenda/agenda';
import { AgendaService } from '../../modules/agenda/agenda.service';
import { RowCardListComponent } from '../../modules/shared/row-card-list';
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="h0" i18n>Meetings</span>
        <app-row-card-list tableName="agenda" [editable]="adminService.editMode()" [gap]="4"
            [getUrl]="getUrl"/>
    `,
    host: { class: 'page narrow' },
    imports: [RowCardListComponent],
})
export class MeetingsPageComponent extends PrivatePageComponent {

    private readonly agendaService = inject(AgendaService);

    protected readonly agendas = this.agendaService.manyAsSignal();
    
    protected addAgenda = async () => {
        await this.agendaService.create({ name: "", unit: 18 } as Agenda.Insert);
    }

    protected async updateAgendas(agendas: Agenda.Row[]) {
        await this.agendaService.upsert(agendas);
    }

    protected getUrl = (agenda: Agenda.Row) => `/meetings/${agenda.id}`;
}
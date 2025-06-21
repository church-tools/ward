import { Component, inject } from '@angular/core';
import { Agenda } from '../modules/agenda/agenda';
import { AgendaService } from '../modules/agenda/agenda.service';
import { RowCardListComponent } from "../modules/shared/row-card-list";
import { PageComponent } from '../shared/page/page';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Sitzungen</span>
        <app-row-card-list tableName="agenda" [editable]="true"/>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [RowCardListComponent],
})
export class MeetingsPageComponent extends PageComponent {

    private readonly agendaService = inject(AgendaService);

    protected readonly agendas = this.agendaService.asSignal();
    
    protected addAgenda = async () => {
        await this.agendaService.create({ name: "", unit: 18 });
    }

    protected async updateAgendas(agendas: Agenda.Row[]) {
        await this.agendaService.upsert(agendas);
    }
}
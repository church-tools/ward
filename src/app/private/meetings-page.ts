import { Component, inject } from '@angular/core';
import { Agenda } from '../modules/agenda/agenda';
import { AgendaService } from '../modules/agenda/agenda.service';
import { RowCardListComponent } from "../modules/shared/row-card-list";
import AsyncButtonComponent from "../shared/form/button/async/async-button";
import { PageComponent } from '../shared/page/page';
import { firstFreeIndex } from '../shared/utils/dict-utils';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Sitzungen</span>
        <!-- <app-card-list [items]="agendas()" [reorderable]="true" orderByKey="index"
            (orderChange)="updateAgendas($event)">
        </app-card-list> -->
        <app-row-card-list tableName="agenda" [editable]="true"/>
        <app-async-button icon="add" type="form" [onClick]="addAgenda"></app-async-button>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [AsyncButtonComponent, RowCardListComponent],
})
export class MeetingsPageComponent extends PageComponent {

    private readonly agendaService = inject(AgendaService);

    protected readonly agendas = this.agendaService.asSignal();
    
    protected addAgenda = async () => {
        const agendas = await this.agendaService.getAllById()
        const firstFreeId = firstFreeIndex(agendas);
        const { data } = await this.agendaService.table
            .insert(<Agenda.Insert>{
                id: firstFreeId,
                name: "",
                unit: 18,
            })
            .throwOnError();
    }

    protected async updateAgendas(agendas: Agenda.Row[]) {
        await this.agendaService.upsert(agendas);
    }
}
import { Component, inject } from '@angular/core';
import { Agenda } from '../modules/agenda/agenda';
import { AgendaService } from '../modules/agenda/agenda.service';
import { RowCardListComponent } from "../modules/shared/row-card-list";
import AsyncButtonComponent from "../shared/form/button/async/async-button";
import { PageComponent } from '../shared/page/page';

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
        await this.agendaService.create({ name: "", unit: 18 });
    }

    protected async updateAgendas(agendas: Agenda.Row[]) {
        await this.agendaService.upsert(agendas);
    }
}
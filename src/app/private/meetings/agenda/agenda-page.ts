import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Task } from '../../../modules/task/task';
import { BackButtonComponent } from '../../shared/back-button';
import { RowPageComponent } from '../../shared/row-page';

@Component({
    selector: 'app-agenda-page',
    template: `
        <app-back-button class="me-auto"/>
        <span class="h0">{{title()}}</span>
        <app-row-card-list tableName="task" [editable]="true"
            [getUrl]="getTaskUrl"
            [prepareInsert]="prepareTaskInsert"/>
        <router-outlet/>
    `,
    styleUrls: ['../../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [RouterOutlet, RowCardListComponent, BackButtonComponent],
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    constructor() {
        super(inject(AgendaService));
    }

    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;
    protected prepareTaskInsert = (task: Task.Insert) => {
        const agenda = this.row();
        if (!agenda) throw new Error("Agenda row is not set");
        task.agenda = +agenda.id;
    }
}
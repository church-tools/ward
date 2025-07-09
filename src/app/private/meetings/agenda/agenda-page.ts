import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { ProfileService } from '../../../modules/profile/profile.service';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Task } from '../../../modules/task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { BackButtonComponent } from '../../shared/back-button';
import { RowPageComponent } from '../../shared/row-page';
import { DrawerComponent } from "../../shared/drawer/drawer";

@Component({
    selector: 'app-agenda-page',
    template: `
        <app-drawer [routerOutlet]="routerOutlet">
            <div main class="page narrow">
                <app-back-button class="me-auto"/>
                <span class="h0">{{title()}}</span>
                <app-row-card-list tableName="task" [editable]="true"
                    [filter]="taskFilter()"
                    [getUrl]="getTaskUrl"
                    [prepareInsert]="prepareTaskInsert"/>
            </div>
            <div drawer>
                <router-outlet #routerOutlet="outlet" router/>
            </div>
        </app-drawer>
    `,
    imports: [RouterOutlet, RowCardListComponent, BackButtonComponent, DrawerComponent],
    host: { class: 'full-width'}
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    private readonly profileService = inject(ProfileService);
    protected readonly taskQuery = xcomputed([this.row], row => ({ agenda: row?.id }));
    protected readonly taskFilter = xcomputed([this.row], row => (task: Task.Row) => task.agenda === row?.id);

    constructor() {
        super(inject(AgendaService));
    }


    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;
    
    protected prepareTaskInsert = async (task: Task.Insert) => {
        const agenda = this.row();
        if (!agenda) throw new Error("Agenda row is not set");
        task.agenda = +agenda.id;
        task.created_by = (await this.profileService.own.get()).id;
    }
}
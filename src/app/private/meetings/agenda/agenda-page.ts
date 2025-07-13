import { Component, inject, signal, viewChild } from '@angular/core';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { ProfileService } from '../../../modules/profile/profile.service';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Task } from '../../../modules/task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { BackButtonComponent } from '../../shared/back-button';
import { RouterOutletDrawerComponent } from "../../shared/router-outlet-drawer/router-outlet-drawer";
import { RowPageComponent } from '../../shared/row-page';

@Component({
    selector: 'app-agenda-page',
    template: `
        <app-router-outlet-drawer
            (onClose)="navigateToThis()"
            (activated)="onActivate($event)">
            <div class="page narrow">
                <app-back-button class="me-auto"/>
                <span class="h0">{{title()}}</span>
                <app-row-card-list #taskList tableName="task" [editable]="true"
                    [filter]="taskFilter()"
                    [getUrl]="getTaskUrl"
                    [activeId]="activeTaskId()"
                    [prepareInsert]="prepareTaskInsert"/>
            </div>
        </app-router-outlet-drawer>
    `,
    imports: [RowCardListComponent, BackButtonComponent, RouterOutletDrawerComponent],
    host: { class: 'full-width'}
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    private readonly profileService = inject(ProfileService);
    protected readonly taskQuery = xcomputed([this.row], row => ({ agenda: row?.id }));
    protected readonly taskFilter = xcomputed([this.row], row => (task: Task.Row) => task.agenda === row?.id);
    protected readonly taskList = viewChild.required<RowCardListComponent<'task'>>('taskList');
    protected readonly activeTaskId = signal<number | null>(null);

    constructor() {
        super(inject(AgendaService));
    }

    protected onActivate(id: string | null) {
        this.activeTaskId.set(id ? +id : null);
    }

    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;
    
    protected prepareTaskInsert = async (task: Task.Insert) => {
        const agenda = this.row();
        if (!agenda) throw new Error("Agenda row is not set");
        task.agenda = +agenda.id;
        task.created_by = (await this.profileService.own.get()).id;
    }
}
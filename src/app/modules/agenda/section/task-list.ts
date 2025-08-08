import { Component, inject, input, signal, viewChild } from '@angular/core';
import { ProfileService } from '../../profile/profile.service';
import { RowCardListComponent } from '../../shared/row-card-list';
import { Task } from '../../task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';

@Component({
    selector: 'app-task-list',
    template: `
        <app-row-card-list #taskList tableName="task" [editable]="true"
            [filter]="taskFilter()"
            [getUrl]="getTaskUrl"
            [activeId]="activeTaskId()"
            [prepareInsert]="prepareTaskInsert"/>
    `,
    imports: [RowCardListComponent],
    host: { class: 'full-width'}
})
export class TaskListComponent {
    
    readonly agendaId = input.required<number>();
    private readonly profileService = inject(ProfileService);
    protected readonly taskQuery = xcomputed([this.agendaId], agenda => ({ agenda }));
    protected readonly taskFilter = xcomputed([this.agendaId], agenda => (task: Task.Row) => task.agenda === agenda);
    protected readonly taskList = viewChild.required<RowCardListComponent<'task'>>('taskList');
    protected readonly activeTaskId = signal<number | null>(null);

    protected onActivate(id: string | null) {
        this.activeTaskId.set(id ? +id : null);
    }

    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;
    
    protected prepareTaskInsert = async (task: Task.Insert) => {
        const agendaId = this.agendaId();
        if (!agendaId) throw new Error("Agenda row is not set");
        task.agenda = agendaId;
        task.created_by = (await this.profileService.own.get()).id;
    }
}
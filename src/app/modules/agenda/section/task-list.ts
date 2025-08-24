import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { ProfileService } from '../../profile/profile.service';
import { RowCardListComponent } from '../../shared/row-card-list';
import { Task } from '../../task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { Table } from '../../shared/table.types';

@Component({
    selector: 'app-task-list',
    template: `
        <app-row-card-list #taskList tableName="task" [editable]="true"
            [getQuery]="getTaskQuery()"
            [getUrl]="getTaskUrl"
            [activeId]="activeTaskId()"
            [prepareInsert]="prepareTaskInsert"
            (onDrag)="onDrag.emit($event)"/>
    `,
    imports: [RowCardListComponent],
    host: { class: 'full-width' },
})
export class TaskListComponent {
    
    private readonly profileService = inject(ProfileService);
    
    readonly agendaId = input.required<number>();
    readonly stages = input.required<Task.Stage[]>();
    readonly onDrag = output<Task.Row | null>();


    protected readonly getTaskQuery = xcomputed([this.agendaId, this.stages],
        (agenda, stages) => (table: Table<'task'>) =>
            table.find()
                .eq('agenda', agenda)
                .in('stage', stages!));
    protected readonly taskFilter = xcomputed([this.agendaId, this.stages],
        ((agenda, stages) => (task: Task.Row) => task.agenda === agenda && stages!.includes(task.stage)));
    protected readonly taskList = viewChild.required<RowCardListComponent<'task'>>('taskList');
    protected readonly activeTaskId = signal<number | null>(null);

    protected onActivate(id: string | null) {
        this.activeTaskId.set(id ? +id : null);
    }

    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;
    
    protected prepareTaskInsert = async (task: Task.Insert) => {
        task.agenda = this.agendaId();
        task.stage = this.stages()[0];
        task.created_by = (await this.profileService.own.asPromise()).id;
    }
}
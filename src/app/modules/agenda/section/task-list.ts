import { Component, inject, input } from '@angular/core';
import { RowPageService } from '../../../private/row-page.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { ProfileService } from '../../profile/profile.service';
import { RowCardListComponent } from '../../shared/row-card-list';
import { Table } from '../../shared/table.types';
import { Task } from '../../task/task';

@Component({
    selector: 'app-task-list',
    template: `
        <app-row-card-list #taskList tableName="task" [editable]="true"
            [getQuery]="getTaskQuery()"
            [getUrl]="getTaskUrl"
            [activeId]="activeTaskId()"
            [prepareInsert]="prepareTaskInsert"/>
    `,
    imports: [RowCardListComponent],
    host: { class: 'full-width' },
})
export class TaskListComponent {
    
    private readonly profileService = inject(ProfileService);
    private readonly rowPageService = inject(RowPageService);
    
    readonly agendaId = input.required<number>();
    readonly stages = input.required<Task.Stage[]>();

    protected readonly getTaskQuery = xcomputed([this.agendaId, this.stages],
        (agenda, stages) => (table: Table<'task'>) => table.find()
            .eq('agenda', agenda)
            .in('stage', stages));
    protected readonly taskFilter = xcomputed([this.agendaId, this.stages],
        ((agenda, stages) => (task: Task.Row) => task.agenda === agenda && stages.includes(task.stage)));
    protected readonly activeTaskId = xcomputed([this.rowPageService.openRows],
        openRows => openRows['task'] ?? null);

    protected getTaskUrl = (task: Task.Row | null) => `/meetings/${this.agendaId()}/${task?.id ?? ""}`;
    
    protected prepareTaskInsert = async (task: Task.Insert) => {
        task.agenda = this.agendaId();
        task.stage = this.stages()[0];
        task.created_by ??= (await this.profileService.own.asPromise()).id;
    }
}
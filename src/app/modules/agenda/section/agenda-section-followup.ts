import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TaskViewService } from '../../task/task-view.service';
import { AgendaSection } from './agenda-section';
import { TaskListComponent } from './task-list';

@Component({
    selector: 'app-agenda-section-followup',
    template: `
        <h1 class="mb-3">{{ taskView.namePlural | async }}</h1>
        <app-task-list [agendaId]="section().agenda"
            [stages]="['task', 'in_progress', 'acknowledged']"/>
    `,
    imports: [TaskListComponent, AsyncPipe],
})
export class AgendaSectionFollowupComponent {

    protected readonly taskView = inject(TaskViewService);
    
    readonly section = input.required<AgendaSection.Row>();

}
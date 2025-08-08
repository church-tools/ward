import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TaskViewService } from '../../task/task-view.service';
import { AgendaSection } from './agenda-section';
import { AgendaSectionService } from './agenda-section.service';
import { TaskListComponent } from './task-list';

@Component({
    selector: 'app-agenda-section-tasks',
    template: `
        <h1 class="mb-3">{{ taskView.topic.namePlural | async }}</h1>
        <app-task-list [agendaId]="section().agenda" [stages]="['task']"/>
    `,
    imports: [TaskListComponent, AsyncPipe],
})
export class AgendaSectionTasksComponent {

    protected readonly agendaSectionService = inject(AgendaSectionService)
    protected readonly taskView = inject(TaskViewService);
    
    readonly section = input.required<AgendaSection.Row>();

}
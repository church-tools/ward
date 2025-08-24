import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { AgendaSectionTasksComponent } from './agenda-section-tasks';
import { TaskListComponent } from './task-list';

@Component({
    selector: 'app-agenda-section-suggestions',
    template: `
        <h1 class="mb-3">{{ taskView.suggestion.namePlural | async }}</h1>
        <app-task-list [agendaId]="section().agenda" [stages]="['suggestion']"
            (onDrag)="draggedTask.emit($event)"/>
    `,
    imports: [TaskListComponent, AsyncPipe],
})
export class AgendaSectionSuggestionsComponent extends AgendaSectionTasksComponent {

}
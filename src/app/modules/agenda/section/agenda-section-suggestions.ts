import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { TaskViewService } from '../../task/task-view.service';
import { AgendaSection } from './agenda-section';
import { TaskListComponent } from './task-list';

@Component({
    selector: 'app-agenda-section-suggestions',
    template: `
        <h1 class="mb-3">{{ taskView.suggestion.namePlural | async }}</h1>
        <app-task-list [agendaId]="section().agenda" [stages]="['suggestion']"/>
    `,
    imports: [TaskListComponent, AsyncPipe],
})
export class AgendaSectionSuggestionsComponent {

    protected readonly taskView = inject(TaskViewService);
    
    readonly section = input.required<AgendaSection.Row>();

}
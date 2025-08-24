import { Component } from '@angular/core';
import { AgendaPageComponent } from '../../../private/meetings/agenda/agenda-page';
import { ListRowComponent } from '../../shared/list-row';
import { Task } from '../../task/task';
import { AgendaSectionFollowupComponent } from "./agenda-section-followup";
import { AgendaSectionPrayerComponent } from "./agenda-section-prayer";
import { AgendaSectionSuggestionsComponent } from "./agenda-section-suggestions";
import { AgendaSectionTasksComponent } from "./agenda-section-tasks";
import { AgendaSectionTextComponent } from "./agenda-section-text";

@Component({
    selector: 'app-agenda-item-list-row',
    template: `
        <div class="column m-6-8">
            @switch (row().type) {
                @case ('text') {
                    <app-agenda-section-text [section]="row()"/>
                }
                @case ('prayer') {
                    <app-agenda-section-prayer [section]="row()"/>
                }
                @case ('task_suggestions') {
                    <app-agenda-section-suggestions [section]="row()"
                        (draggedTask)="taskDragged($event)"/>
                }
                @case ('tasks') {
                    <app-agenda-section-tasks [section]="row()"
                        (draggedTask)="taskDragged($event)"/>
                }
                @case ('followups') {
                    <app-agenda-section-followup [section]="row()"/>
                }
            }
        </div>
    `,
    host: { class: 'full-width' },
    imports: [AgendaSectionTextComponent, AgendaSectionPrayerComponent, AgendaSectionTasksComponent, AgendaSectionFollowupComponent, AgendaSectionSuggestionsComponent],
})
export class AgendaItemListRowComponent extends ListRowComponent<'agenda_section'> {

    protected taskDragged(task: Task.Row | null) {
        const page = this.page();
        const agendaPage = page instanceof AgendaPageComponent ? page : null;
        if (!agendaPage) return;
        agendaPage.draggedTask.set(task);
    }
}
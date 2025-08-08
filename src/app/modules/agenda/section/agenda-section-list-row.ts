import { Component } from '@angular/core';
import { ListRowComponent } from '../../shared/list-row';
import { AgendaSectionTextComponent } from "./agenda-section-text";
import { TaskListComponent } from "./task-list";

@Component({
    selector: 'app-agenda-item-list-row',
    template: `
        <div class="column m-6-8">
            @switch (row().type) {
                @case ('text') {
                    <app-agenda-section-text [section]="row()"/>
                }
                @case ('tasks') {
                    <app-task-list [agendaId]="row().agenda"/>
                }
            }
        </div>
    `,
    host: { class: 'full-width' },
    imports: [TaskListComponent, AgendaSectionTextComponent],
})
export class AgendaItemListRowComponent extends ListRowComponent<'agenda_section'> {

}
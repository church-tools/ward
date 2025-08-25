import { Component, inject } from '@angular/core';
import { AdminService } from '../../../private/shared/admin.service';
import { ListRowComponent } from '../../shared/list-row';
import { AgendaSectionFollowupComponent } from "./agenda-section-followup";
import { AgendaSectionPrayerComponent } from "./agenda-section-prayer";
import { AgendaSectionSuggestionsComponent } from "./agenda-section-suggestions";
import { AgendaSectionTasksComponent } from "./agenda-section-tasks";
import { AgendaSectionTextComponent } from "./agenda-section-text";

@Component({
    selector: 'app-agenda-item-list-row',
    template: `
        <div class="column" [class.m-6-8]="adminService.editMode()">
            @switch (row().type) {
                @case ('text') {
                    <app-agenda-section-text [section]="row()"/>
                }
                @case ('prayer') {
                    <app-agenda-section-prayer [section]="row()"/>
                }
                @case ('task_suggestions') {
                    <app-agenda-section-suggestions #suggestions [section]="row()"/>
                }
                @case ('tasks') {
                    <app-agenda-section-tasks #tasks [section]="row()"/>
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

    protected readonly adminService = inject(AdminService);
}
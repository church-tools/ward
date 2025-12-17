import { Component, inject } from '@angular/core';
import { AdminService } from '../../../private/shared/admin.service';
import { ListRowComponent } from '../../shared/list-row';
import { AgendaSectionFollowupComponent } from "./variants/agenda-section-followup";
import { AgendaSectionPrayerComponent } from "./variants/agenda-section-prayer";
import { AgendaSectionSuggestionsComponent } from "./variants/agenda-section-suggestions";
import { AgendaSectionTopicsComponent } from "./variants/agenda-section-topics";
import { AgendaSectionTextComponent } from "./variants/agenda-section-text";
import ButtonComponent from '../../../shared/form/button/button';

@Component({
    selector: 'app-agenda-section-list-row',
    template: `
        <div class="column" [class.m-6-8]="adminService.editMode()">
            @if (adminService.editMode()) {
                <app-button icon="delete" type="subtle" size="large"
                    class="z-1 icon-only position-absolute right-1 top-1"
                    (onClick)="remove()"/>
            }
            @switch (row().type) {
                @case ('text') {
                    <app-agenda-section-text [section]="row()"/>
                }
                @case ('prayer') {
                    <app-agenda-section-prayer [section]="row()"/>
                }
                @case ('task_suggestions') {
                    <app-agenda-section-suggestions [section]="row()"/>
                }
                @case ('tasks') {
                    <app-agenda-section-tasks [section]="row()"/>
                }
                @case ('followups') {
                    <app-agenda-section-followup [section]="row()"/>
                }
            }
        </div>
    `,
    host: { class: 'full-width' },
    imports: [AgendaSectionTextComponent, AgendaSectionPrayerComponent, AgendaSectionTopicsComponent,
        AgendaSectionFollowupComponent, AgendaSectionSuggestionsComponent, ButtonComponent],
})
export class AgendaSectionListRowComponent extends ListRowComponent<'agenda_section'> {

    protected readonly adminService = inject(AdminService);

    remove() {
        return this.onRemove()?.(this.row());
    }
}

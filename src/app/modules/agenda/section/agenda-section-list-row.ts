import { Component, inject } from '@angular/core';
import { AdminService } from '../../../private/shared/admin.service';
import ButtonComponent from '../../../shared/form/button/button';
import { ListRowComponent } from '../../shared/row-card-list/list-row';
import { AgendaSectionPrayerComponent } from "./variants/agenda-section-prayer";
import { AgendaSectionResolutionsComponent } from './variants/agenda-section-resolutions';
import { AgendaSectionSpiritualThoughtComponent } from "./variants/agenda-section-spiritual-thought";
import { AgendaSectionSuggestionsComponent } from "./variants/agenda-section-suggestions";
import { AgendaSectionTextComponent } from "./variants/agenda-section-text";
import { AgendaSectionTopicsComponent } from "./variants/agenda-section-topics";

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
                @case ('spiritual_thought') {
                    <app-agenda-section-spiritual-thought [section]="row()"/>
                }
                @case ('suggestions') {
                    <app-agenda-section-suggestions [section]="row()"/>
                }
                @case ('topics') {
                    <app-agenda-section-topics [section]="row()"/>
                }
                @case ('resolutions') {
                    <app-agenda-section-resolutions [section]="row()"/>
                }
            }
        </div>
    `,
    host: { class: 'full-width' },
    imports: [AgendaSectionTextComponent, AgendaSectionPrayerComponent, AgendaSectionTopicsComponent,
        AgendaSectionResolutionsComponent, AgendaSectionSuggestionsComponent, ButtonComponent,
        AgendaSectionSpiritualThoughtComponent],
})
export class AgendaSectionListRowComponent extends ListRowComponent<'agenda_section'> {

    protected readonly adminService = inject(AdminService);

    remove() {
        return this.onRemove()?.(this.row());
    }
}

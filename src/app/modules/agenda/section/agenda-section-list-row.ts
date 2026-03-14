import { Component, inject } from '@angular/core';
import { AgendaPage } from '../../../private/meetings/agenda/agenda-page';
import { AdminService } from '../../../private/shared/admin.service';
import Button from '../../../shared/form/button/button';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { ListRow } from '../../shared/row-card-list/list-row';
import { AgendaSectionPrayer } from "./variants/agenda-section-prayer";
import { AgendaSectionResolutions } from './variants/agenda-section-resolutions';
import { AgendaSectionSpiritualThought } from "./variants/agenda-section-spiritual-thought";
import { AgendaSectionSuggestions } from "./variants/agenda-section-suggestions";
import { AgendaSectionText } from "./variants/agenda-section-text";
import { AgendaSectionTopics } from "./variants/agenda-section-topics";

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
                    <app-agenda-section-prayer [agenda]="agenda()" [section]="row()"/>
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
    imports: [AgendaSectionText, AgendaSectionPrayer, AgendaSectionTopics,
        AgendaSectionResolutions, AgendaSectionSuggestions, Button,
        AgendaSectionSpiritualThought],
})
export class AgendaSectionListRow extends ListRow<'agenda_section'> {

    protected readonly adminService = inject(AdminService);

    protected readonly agenda = xcomputed([this.page],
        page => (page as AgendaPage).syncedRow.value())

    remove() {
        return this.onRemove()?.(this.row());
    }
}

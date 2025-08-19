import { Component, signal, viewChild } from '@angular/core';
import { AgendaSection } from '../../../modules/agenda/section/agenda-section';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Task } from '../../../modules/task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { BackButtonComponent } from '../../shared/back-button';
import { RouterOutletDrawerComponent } from "../../shared/router-outlet-drawer/router-outlet-drawer";
import { RowPageComponent } from '../../shared/row-page';
import { Table } from '../../../modules/shared/table.types';

@Component({
    selector: 'app-agenda-page',
    template: `
        <app-router-outlet-drawer
            (onClose)="navigateToThis()"
            (activated)="onActivate($event)">
            <div class="page narrow">
                <app-back-button class="me-auto display-when-medium"/>
                <span class="h0">{{title()}}</span>
                <app-row-card-list #sectionList tableName="agenda_section"
                    [cardsVisible]="adminService.editMode()"
                    [editable]="adminService.editMode()"
                    [getQuery]="sectionQuery()"
                    [prepareInsert]="prepareSectionInsert"/>
            </div>
        </app-router-outlet-drawer>
    `,
    imports: [RowCardListComponent, BackButtonComponent, RouterOutletDrawerComponent],
    host: { class: 'full-width'}
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    protected readonly sectionQuery = xcomputed([this.row],
        row => row ? (table: Table<'agenda_section'>) => table.find().eq('agenda', row.id) : null);
    protected readonly sectionList = viewChild.required<RowCardListComponent<'task'>>('sectionList');
    protected readonly activeTaskId = signal<number | null>(null);
    protected readonly tableName = 'agenda';

    protected onActivate(id: string | null) {
        this.activeTaskId.set(id ? +id : null);
    }

    protected getTaskUrl = (task: Task.Row) => `/meetings/${task.agenda}/${task.id}`;

    protected prepareSectionInsert = (section: AgendaSection.Insert) => {
        const agenda = this.row();
        if (!agenda) throw new Error("Agenda row is not set");
        section.agenda = +agenda.id;
    }
}
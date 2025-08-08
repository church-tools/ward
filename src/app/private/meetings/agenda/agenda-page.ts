import { Component, inject, signal, viewChild } from '@angular/core';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { AgendaSection } from '../../../modules/agenda/section/agenda-section';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Task } from '../../../modules/task/task';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { BackButtonComponent } from '../../shared/back-button';
import { RouterOutletDrawerComponent } from "../../shared/router-outlet-drawer/router-outlet-drawer";
import { RowPageComponent } from '../../shared/row-page';

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
                    [filter]="sectionFilter()"
                    [prepareInsert]="prepareSectionInsert"/>
            </div>
        </app-router-outlet-drawer>
    `,
    imports: [RowCardListComponent, BackButtonComponent, RouterOutletDrawerComponent],
    host: { class: 'full-width'}
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    protected readonly sectionFilter = xcomputed([this.row], row => (section: AgendaSection.Row) => section.agenda === row?.id);
    protected readonly sectionList = viewChild.required<RowCardListComponent<'task'>>('sectionList');
    protected readonly activeTaskId = signal<number | null>(null);

    constructor() {
        super(inject(AgendaService));
    }

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
import { Component, inject, signal, viewChild } from '@angular/core';
import { AgendaSection } from '../../../modules/agenda/section/agenda-section';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Table } from '../../../modules/shared/table.types';
import { Task } from '../../../modules/task/task';
import { DragDropService } from '../../../shared/service/drag-drop.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { BackButtonComponent } from '../../shared/back-button';
import { RouterOutletDrawerComponent } from "../../shared/router-outlet-drawer/router-outlet-drawer";
import { RowPageComponent } from '../../shared/row-page';
import { AgendaDropZoneComponent } from "./drop-zone/agenda-drop-zone";

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
                    [gap]="8"
                    [prepareInsert]="prepareSectionInsert"
                    [page]="this"/>
            </div>
        </app-router-outlet-drawer>
        @if (draggedTask(); as draggedTask) {
            <app-agenda-drop-zone [draggedTask]="draggedTask"/>
        }
    `,
    imports: [RowCardListComponent, BackButtonComponent, RouterOutletDrawerComponent, AgendaDropZoneComponent],
    host: { class: 'full-width' }
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    private readonly dragDrop = inject(DragDropService);

    protected readonly sectionQuery = xcomputed([this.row],
        row => row ? (table: Table<'agenda_section'>) => table.find().eq('agenda', row.id) : null);
    protected readonly draggedTask = xcomputed([this.dragDrop.dragged],
        drag => drag?.data && 'agenda' in drag.data ? drag : null);

    protected readonly sectionList = viewChild.required<RowCardListComponent<'task'>>('sectionList');
    
    protected readonly activeTaskId = signal<number | null>(null);
    protected readonly tableName = 'agenda';
    protected readonly dragData = signal<Task.Row | null>(null);

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

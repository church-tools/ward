import { Component, inject, signal, viewChild } from '@angular/core';
import { AgendaSection } from '../../../modules/agenda/section/agenda-section';
import { RowCardListComponent } from '../../../modules/shared/row-card-list';
import { Table } from '../../../modules/shared/table.types';
import { Task } from '../../../modules/task/task';
import { IconPickerComponent } from "../../../shared/form/icon-picker/icon-picker";
import { TextInputComponent } from "../../../shared/form/text/text-input";
import { IconComponent } from "../../../shared/icon/icon";
import { DragDropService } from '../../../shared/service/drag-drop.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { SyncedFieldDirective } from "../../../shared/utils/supa-sync/synced-field.directive";
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
                @if (adminService.editMode()) {
                    <div class="d-flex">
                        <app-icon-picker class="ms--12" [iconOptions]="[]"/>
                        <app-text-input [syncedRow]="syncedRow" column="name" [subtle]="true" textClass="h0"/>
                    </div>
                } @else {
                    <span class="h0">
                        @let row = syncedRow.value();
                        @if (row && row.shape && windowService.isLarge()) {
                            <app-icon [icon]="row.shape" [filled]="true" size="xl"
                                class="{{row.color}}-active ms--12"></app-icon>
                        }
                        {{title()}}
                    </span>
                }
                <app-row-card-list #sectionList tableName="agenda_section"
                    [cardsVisible]="adminService.editMode()"
                    [editable]="adminService.editMode()"
                    [getQuery]="sectionQuery()"
                    [gap]="8"
                    [insertContext]="syncedRow"
                    [prepareInsert]="prepareSectionInsert"
                    [page]="this"/>
            </div>
        </app-router-outlet-drawer>
        <app-agenda-drop-zone [draggedTask]="draggedTask()"/>
    `,
    imports: [RowCardListComponent, RouterOutletDrawerComponent, AgendaDropZoneComponent, TextInputComponent,
        SyncedFieldDirective, IconComponent, IconPickerComponent],
    host: { class: 'full-width' }
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    private readonly dragDrop = inject(DragDropService);
    private readonly taskDragDrop = this.dragDrop.ensureGroup('task');

    protected readonly sectionQuery = xcomputed([this.syncedRow.value],
        row => row ? (table: Table<'agenda_section'>) => table.find().eq('agenda', row.id) : null);
    protected readonly draggedTask = xcomputed([this.taskDragDrop.dragged],
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
        const agenda = this.syncedRow.value();
        if (!agenda) throw new Error("Agenda row is not set");
        section.agenda = +agenda.id;
    }
}

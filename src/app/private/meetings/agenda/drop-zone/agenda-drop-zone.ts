import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, OnDestroy, signal, viewChildren } from "@angular/core";
import { Agenda } from '../../../../modules/agenda/agenda';
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed, xeffect } from "../../../../shared/utils/signal-utils";

@Component({
    selector: 'app-agenda-drop-zone',
    template: `
        <div class="drop-zone"
            (mouseenter)="onMouseEnter()"
            (mouseleave)="onMouseLeave()"
            [class.drag-over]="dragOver()">
            <div class="acrylic-card column gap-4 p-4">
                @for (agenda of agendas(); track agenda) {
                    @let active = agenda.id === lastDrag()?.data?.agenda;
                    <div class="card canvas-card selectable-card selectable-outlined-card"
                        cdkDropList
                        [cdkDropListDisabled]="active"
                        (cdkDropListEntered)="onAgendaDropListEntered(agenda)"
                        (cdkDropListExited)="onAgendaDropListExited(agenda)"
                        (cdkDropListDropped)="onTaskDropped(agenda)"
                        [class.disabled]="active">
                        @if (active) {
                            <div class="indicator accent-fg"></div>
                        }
                        <app-agenda-list-row [row]="agenda"/>
                    </div>
                }
            </div>
        </div>
    `,
    styleUrl: './agenda-drop-zone.scss',
    imports: [AgendaListRowComponent, CdkDropList],
    host: {
        '[class.visible]': 'draggedTask()',
    }
})
export class AgendaDropZoneComponent implements OnDestroy {

    private readonly supabase = inject(SupabaseService);
    private readonly dragDrop = inject(DragDropService);
    
    readonly draggedTask = input.required<DragData<Task.Row> | null>();

    
    private readonly dropLists = viewChildren(CdkDropList);

    protected readonly lastDrag = signal<DragData<Task.Row> | null>(null);
    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get()
              .then(agendas => agendas.sort((a, b) => a.position - b.position)));

    protected readonly dragOver = signal(false);

    private readonly dragDropGroup = this.dragDrop.ensureGroup('task');

    constructor() {
        xeffect([this.dropLists], dropLists => {
            this.dragDropGroup.registerTargets(dropLists);
        });
        xeffect([this.draggedTask], lastDrag => {
            if (!lastDrag) return;
            this.lastDrag.set(lastDrag);
        });
    }

    protected onMouseEnter() {   
        this.dragOver.set(true);
    }

    protected onMouseLeave() {
        this.dragOver.set(false);
    }

    protected onAgendaDropListEntered(agenda: Agenda.Row) {
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.add('shrink');
    }

    protected onAgendaDropListExited(agenda: Agenda.Row) {
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
    }

    protected async onTaskDropped(agenda: Agenda.Row) {
        const drag = this.dragDropGroup.dragged();
        if (!drag) throw new Error('No task is being dragged');
        const task = drag.data as Task.Row;
        // await this.supabase.sync.from('task').update({
        //     id: task.id,
        //     agenda: agenda.id
        // });
    }

    ngOnDestroy() {
        this.dragDropGroup.unregisterTargets(this.dropLists());
    }
}
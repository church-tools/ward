import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, OnDestroy, signal, viewChildren } from "@angular/core";
import { Subscription } from 'rxjs';
import { Agenda } from '../../../../modules/agenda/agenda';
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService, DropTarget } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed, xcomputed, xeffect } from "../../../../shared/utils/signal-utils";

@Component({
    selector: 'app-agenda-drop-zone',
    template: `
        <div class="drop-zone"
            (mouseenter)="onMouseEnter()"
            (mouseleave)="onMouseLeave()"
            [class.drag-over]="dragOver()">
            <div class="acrylic-card column gap-4 p-4">
                @for (agenda of agendas(); track agenda) {
                    @let active = agenda.id === draggedTask().data.agenda;
                    <div class="card canvas-card selectable-card selectable-outlined-card"
                        cdkDropList
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
        'animate.leave': 'slide-out'
    }
})
export class AgendaDropZoneComponent implements OnDestroy {

    private readonly supabase = inject(SupabaseService);
    private readonly dragDrop = inject(DragDropService);

    readonly draggedTask = input.required<DragData<Task.Row>>();

    private readonly dropLists = viewChildren(CdkDropList);

    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get()
              .then(agendas => agendas.sort((a, b) => a.position - b.position)));
    private readonly targets = xcomputed([this.dropLists],
        dropLists => dropLists.map(dropList => <DropTarget>{ dropList, identity: 'task' }));

    protected readonly dragOver = signal(false);

    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.targets], targets => {
            this.dragDrop.registerTargets(targets);
        });
    }

    protected onMouseEnter() {   
        this.dragOver.set(true);
    }

    protected onMouseLeave() {
        this.dragOver.set(false);
    }

    protected onAgendaDropListEntered(agenda: Agenda.Row) {
        this.subscription?.unsubscribe();
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.add('shrink');
    }

    protected onAgendaDropListExited(agenda: Agenda.Row) {
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
        this.subscription?.unsubscribe();
    }

    protected async onTaskDropped(agenda: Agenda.Row) {
        const drag = this.dragDrop.dragged();
        if (!drag) throw new Error('No task is being dragged');
        const task = drag.data as Task.Row;
        // await this.supabase.sync.from('task').update({
        //     id: task.id,
        //     agenda: agenda.id
        // });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
        this.dragDrop.unregisterTargets(this.targets());
    }
}
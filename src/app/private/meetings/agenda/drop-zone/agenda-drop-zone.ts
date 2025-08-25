import { CdkDragExit, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, signal } from "@angular/core";
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed } from "../../../../shared/utils/signal-utils";

@Component({
    selector: 'app-agenda-drop-zone',
    template: `
        <div cdkDropList
            class="drop-zone"
            (mouseenter)="onMouseEnter($event)"
            (mouseleave)="onMouseLeave($event)"
            [class.drag-over]="dragOver()">
            <div class="acrylic-card column gap-4 p-4">
                @for (agenda of agendas(); track agenda) {
                    @let active = agenda.id === draggedTask().data.agenda;
                    <div class="card canvas-card selectable-card selectable-outlined-card"
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
export class AgendaDropZoneComponent {

    private readonly supabase = inject(SupabaseService);
    private readonly dragDrop = inject(DragDropService);

    readonly draggedTask = input.required<DragData<Task.Row>>();

    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get());

    protected readonly dragOver = signal(false);

    protected onMouseEnter(event: MouseEvent) {   
        this.dragOver.set(true);
    }

    protected onMouseLeave(event: MouseEvent) {
        this.dragOver.set(false);
    }

    protected onDragExit(event: CdkDragExit<any>) {
        this.dragOver.set(false);
    }
}
import { CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, OnDestroy, signal } from "@angular/core";
import { Subscription } from 'rxjs';
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed } from "../../../../shared/utils/signal-utils";
import { Agenda } from '../../../../modules/agenda/agenda';

@Component({
    selector: 'app-agenda-drop-zone',
    template: `
        <div cdkDropList
            class="drop-zone"
            (mouseenter)="onMouseEnter()"
            (mouseleave)="onMouseLeave()"
            [class.drag-over]="dragOver()">
            <div class="acrylic-card column gap-4 p-4">
                @for (agenda of agendas(); track agenda) {
                    @let active = agenda.id === draggedTask().data.agenda;
                    <div class="card canvas-card selectable-card selectable-outlined-card"
                        [class.disabled]="active"
                        (mouseenter)="onMouseEnterAgenda(agenda)"
                        (mouseleave)="onMouseLeaveAgenda()">
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

    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get()
              .then(agendas => agendas.sort((a, b) => a.position - b.position)));

    protected readonly dragOver = signal(false);

    private subscription: Subscription | undefined;

    protected onMouseEnter() {   
        this.dragOver.set(true);
    }

    protected onMouseLeave() {
        this.dragOver.set(false);
    }

    protected onMouseEnterAgenda(agenda: Agenda.Row) {
        this.subscription?.unsubscribe();
        // const dragged = this.dragDrop.dragged();
        // dragged?.drag.element.nativeElement.classList.add('shrink');
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.add('shrink');
        this.subscription = this.dragDrop.onDrop.subscribe(async ({ data: task }) => {
            this.dragDrop.consume();
            // await this.supabase.sync.from('task').update({
            //     id: task.id,
            //     agenda: agenda.id
            // });
        });
    }

    protected onMouseLeaveAgenda() {
        const dragged = this.dragDrop.dragged();
        // dragged?.drag.element.nativeElement.classList.remove('shrink');
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
        this.subscription?.unsubscribe();
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
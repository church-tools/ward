import { Component, ElementRef, inject, input, OnDestroy, signal, viewChildren } from "@angular/core";
import { Agenda } from '../../../../modules/agenda/agenda';
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService, DropData } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed, xeffect } from "../../../../shared/utils/signal-utils";

@Component({
    selector: 'app-agenda-drop-zone',
    templateUrl: './agenda-drop-zone.html',
    styleUrl: './agenda-drop-zone.scss',
    imports: [AgendaListRowComponent],
    host: {
        '[class.visible]': 'draggedTask()',
    }
})
export class AgendaDropZoneComponent implements OnDestroy {

    private readonly supabase = inject(SupabaseService);
    private readonly dragDrop = inject(DragDropService);
    private readonly elementRef = inject(ElementRef);
    
    readonly draggedTask = input.required<DragData<Task.Row> | null>();

    private readonly agendaCards = viewChildren('agendaCard', { read: ElementRef });

    protected readonly lastDrag = signal<DragData<Task.Row> | null>(null);
    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get()
              .then(agendas => agendas.sort((a, b) => a.position - b.position)));

    protected readonly dragOver = signal(false);
    protected readonly hoveredAgenda = signal<Agenda.Row | null>(null);

    private readonly dragDropGroup = this.dragDrop.ensureGroup('task');
    
    private dragMoveListener: ((e: MouseEvent | TouchEvent) => void) | null = null;
    private dragEndListener: ((e: MouseEvent | TouchEvent) => void) | null = null;

    constructor() {
        xeffect([this.draggedTask], draggedTask => {
            if (draggedTask) {
                this.startDragPositionMonitoring();
                this.lastDrag.set(draggedTask);
            } else {
                this.stopDragPositionMonitoring();
                this.dragOver.set(false);
            }
        });
    }

    private startDragPositionMonitoring() {
        this.stopDragPositionMonitoring(); // Clean up any existing listener
        
        this.dragMoveListener = (event: MouseEvent | TouchEvent) => {
            const dropZoneEl = (this.elementRef.nativeElement as HTMLElement).querySelector('.drop-zone') as HTMLElement;
            if (!dropZoneEl) return;
            const { clientX, clientY } = event instanceof MouseEvent ? event : event.touches[0];
            const rect = dropZoneEl.getBoundingClientRect();
            const show = (rect.left <= clientX && clientX <= rect.right && 
                        rect.top <= clientY && clientY <= rect.bottom)
                        || clientX < 100;
            this.dragOver.set(show);
            const hoveredAgenda = show
                ? this.findHoveredAgenda(clientX, clientY)
                : null;
            
            // Update hover state and apply preview effects
            const previousHovered = this.hoveredAgenda();
            if (previousHovered !== hoveredAgenda) {
                this.hoveredAgenda.set(hoveredAgenda);
                
                const previewEl = document.querySelector('.cdk-drag-preview');
                if (hoveredAgenda !== null) {
                    previewEl?.classList.add('shrink');
                } else {
                    previewEl?.classList.remove('shrink');
                }
            }
        };

        this.dragEndListener = async (event: MouseEvent | TouchEvent) => {
            const agenda = this.hoveredAgenda();
            if (agenda && this.lastDrag()) {
                // Trigger the drop on the hovered agenda
                const dragData = this.lastDrag()!;
                const previewEl = document.querySelector('.cdk-drag-preview');
                if (previewEl) previewEl.classList.add('shrink-out');
                const agenda = this.hoveredAgenda();
                if (!agenda) return;
                await this.supabase.sync.from('task').update({
                    id: dragData.data.id,
                    agenda: agenda.id
                });
            }
        };

        // Listen for both mouse and touch move events
        document.addEventListener('mousemove', this.dragMoveListener, { passive: true });
        document.addEventListener('touchmove', this.dragMoveListener, { passive: true });
        
        // Listen for mouse and touch release events
        document.addEventListener('mouseup', this.dragEndListener, { passive: true });
        document.addEventListener('touchend', this.dragEndListener, { passive: true });
    }

    private findHoveredAgenda(clientX: number, clientY: number): Agenda.Row | null {
        const index = this.agendaCards().findIndex(card => {
            const cardRect = card.nativeElement.getBoundingClientRect();
            return clientX >= cardRect.left && clientX <= cardRect.right &&
                   clientY >= cardRect.top && clientY <= cardRect.bottom;
        });
        const hovered = index >= 0 ? (this.agendas()?.[index] ?? null) : null;
        return hovered?.id === this.lastDrag()?.data?.agenda ? null : hovered;
    }

    private stopDragPositionMonitoring() {
        if (this.dragMoveListener) {
            document.removeEventListener('mousemove', this.dragMoveListener);
            document.removeEventListener('touchmove', this.dragMoveListener);
            this.dragMoveListener = null;
        }
        if (this.dragEndListener) {
            document.removeEventListener('mouseup', this.dragEndListener);
            document.removeEventListener('touchend', this.dragEndListener);
            this.dragEndListener = null;
        }
        this.hoveredAgenda.set(null);
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
    }

    ngOnDestroy() {
        this.stopDragPositionMonitoring();
    }
}
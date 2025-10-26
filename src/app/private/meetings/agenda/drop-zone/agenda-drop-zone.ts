import { CdkDropList, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, effect, ElementRef, inject, input, OnDestroy, signal, viewChildren } from "@angular/core";
import { Agenda } from '../../../../modules/agenda/agenda';
import { AgendaListRowComponent } from "../../../../modules/agenda/agenda-list-row";
import { Task } from '../../../../modules/task/task';
import { DragData, DragDropService } from '../../../../shared/service/drag-drop.service';
import { SupabaseService } from "../../../../shared/service/supabase.service";
import { asyncComputed, xcomputed, xeffect } from "../../../../shared/utils/signal-utils";

@Component({
    selector: 'app-agenda-drop-zone',
    templateUrl: './agenda-drop-zone.html',
    styleUrl: './agenda-drop-zone.scss',
    imports: [AgendaListRowComponent, CdkDropList],
    host: {
        '[class.visible]': 'draggedTask()',
    }
})
export class AgendaDropZoneComponent implements OnDestroy {

    private readonly supabase = inject(SupabaseService);
    private readonly dragDrop = inject(DragDropService);
    private readonly elementRef = inject(ElementRef);
    
    readonly draggedTask = input.required<DragData<Task.Row> | null>();

    private readonly dropLists = viewChildren(CdkDropList);

    protected readonly lastDrag = signal<DragData<Task.Row> | null>(null);
    protected readonly agendas = asyncComputed([],
        () => this.supabase.sync.from('agenda').readAll().get()
              .then(agendas => agendas.sort((a, b) => a.position - b.position)));

    protected readonly dragOver = signal(false);
    protected readonly hoveredAgenda = signal<Agenda.Row | null>(null);

    private readonly dragDropGroup = this.dragDrop.ensureGroup('task');
    protected readonly targetDropLists = this.dragDropGroup.targets;
    
    private dragMoveListener: ((e: MouseEvent | TouchEvent) => void) | null = null;

    constructor() {
        // Register drop lists AFTER a delay to ensure they're registered after the card-list
        xeffect([this.dropLists], dropLists => {
            setTimeout(() => {
                this.dragDropGroup.registerTargets(dropLists);
            }, 0);
        });
        xeffect([this.draggedTask], lastDrag => {
            if (!lastDrag) return;
            this.lastDrag.set(lastDrag);
        });

        // Monitor drag position for touch devices
        effect(() => {
            const draggedTask = this.draggedTask();
            if (draggedTask) {
                this.startDragPositionMonitoring();
            } else {
                this.stopDragPositionMonitoring();
                this.dragOver.set(false);
            }
        });
    }

    protected onMouseEnter() {   
        this.dragOver.set(true);
    }

    protected onMouseLeave() {
        this.dragOver.set(false);
    }

    private startDragPositionMonitoring() {
        this.stopDragPositionMonitoring(); // Clean up any existing listener
        
        this.dragMoveListener = (e: MouseEvent | TouchEvent) => {
            const dropZoneEl = (this.elementRef.nativeElement as HTMLElement).querySelector('.drop-zone') as HTMLElement;
            if (!dropZoneEl) return;
            
            let clientX: number, clientY: number;
            if (e instanceof TouchEvent && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else if (e instanceof MouseEvent) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                return;
            }

            // Get the actual visual position of the drop zone (including transforms)
            const rect = dropZoneEl.getBoundingClientRect();
            
            // Check if cursor is over the drop zone's current visual position
            const isOverDropZone = clientX >= rect.left && 
                                   clientX <= rect.right && 
                                   clientY >= rect.top && 
                                   clientY <= rect.bottom;
            
            // Also trigger if we're near the left edge (initial trigger area)
            const nearLeftEdge = clientX < 100;
            
            this.dragOver.set(isOverDropZone || nearLeftEdge);

            // Check which agenda card is being hovered
            let hoveredAgenda: Agenda.Row | null = null;
            if (isOverDropZone || nearLeftEdge) {
                const dropLists = this.dropLists(), agendas = this.agendas();
                for (let i = 0; i < dropLists.length; i++) {
                    const dropList = dropLists[i];
                    const cardRect = dropList.element.nativeElement.getBoundingClientRect();
                    if (clientX >= cardRect.left && clientX <= cardRect.right &&
                        clientY >= cardRect.top && clientY <= cardRect.bottom) {
                        const agendaId = dropList.element.nativeElement.id.replace('agenda-drop-', '');
                        if (agendaId) {
                            hoveredAgenda = agendas?.[i] ?? null;
                            break;
                        }
                    }
                }
            }
            
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

        // Listen for both mouse and touch move events
        document.addEventListener('mousemove', this.dragMoveListener, { passive: true });
        document.addEventListener('touchmove', this.dragMoveListener, { passive: true });
    }

    private stopDragPositionMonitoring() {
        if (this.dragMoveListener) {
            document.removeEventListener('mousemove', this.dragMoveListener);
            document.removeEventListener('touchmove', this.dragMoveListener);
            this.dragMoveListener = null;
        }
        this.hoveredAgenda.set(null);
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
    }

    protected onAgendaDropListEntered(agenda: Agenda.Row) {
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.add('shrink');
        this.hoveredAgenda.set(agenda);
    }

    protected onAgendaDropListExited(agenda: Agenda.Row) {
        const previewEl = document.querySelector('.cdk-drag-preview');
        previewEl?.classList.remove('shrink');
        this.hoveredAgenda.set(null);
    }

    protected onTaskDropped(agenda: Agenda.Row) {
        this.handleTaskDropped(agenda);
    }

    private async handleTaskDropped(agenda: Agenda.Row) {
        const drag = this.dragDropGroup.dragged();
        if (!drag) throw new Error('No task is being dragged');
        const task = drag.data as Task.Row;
        await this.supabase.sync.from('task').update({
            id: task.id,
            agenda: agenda.id
        });
    }

    ngOnDestroy() {
        this.stopDragPositionMonitoring();
        this.dragDropGroup.unregisterTargets(this.dropLists());
    }
}
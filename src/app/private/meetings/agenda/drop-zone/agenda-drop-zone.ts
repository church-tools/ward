import { Agenda } from '@/modules/agenda/agenda';
import { AgendaListRow } from '@/modules/agenda/agenda-list-row';
import { AgendaItem } from '@/modules/agenda/item/agenda-item';
import { DragData } from '@/shared/service/drag-drop.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { asyncComputed, xsignal } from '@/shared/utils/signal-utils';
import { EdgePanel, PanelPoint } from '@/shared/widget/edge-panel/edge-panel';
import { Component, ElementRef, inject, input, OnChanges, OnDestroy, viewChild, viewChildren } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';

@Component({
    selector: 'app-agenda-drop-zone',
    templateUrl: './agenda-drop-zone.html',
    styleUrl: './agenda-drop-zone.scss',
    imports: [AgendaListRow, EdgePanel],
})
export class AgendaDropZone implements OnChanges, OnDestroy {
    private readonly supabase = inject(SupabaseService);
    readonly draggedAgendaItem = input.required<DragData<AgendaItem.Row> | null>();
    private readonly panel = viewChild.required(EdgePanel);
    private readonly agendaCards = viewChildren<ElementRef<HTMLElement>>('agendaCard');
    private subscriptions = new Subscription();

    protected readonly lastDrag = xsignal<DragData<AgendaItem.Row> | null>(null);
    protected readonly dragPosition = xsignal<PanelPoint | null>(null);
    protected readonly hoveredAgenda = xsignal<Agenda.Row | null>(null);
    protected readonly agendas = asyncComputed([], () =>
        this.supabase.sync.from('agenda').readAll().get()
            .then(agendas => agendas.sort((a, b) => a.position - b.position)));

    ngOnChanges(): void {
        this.stopTracking();
        const data = this.draggedAgendaItem();
        if (!data) return;
        this.lastDrag.set(data);
        this.subscriptions.add(fromEvent<KeyboardEvent>(document, 'keydown', { capture: true }).subscribe(event => {
            if (event.key === 'Escape') data.dropHandled = true;
        }));
        this.subscriptions.add(data.drag.moved.subscribe(event => {
            const point = { x: event.pointerPosition.x - window.scrollX, y: event.pointerPosition.y - window.scrollY };
            this.dragPosition.set(point);
            const agenda = this.findHoveredAgenda(point);
            this.hoveredAgenda.set(agenda);
            document.querySelector('.cdk-drag-preview')?.classList.toggle('shrink', agenda !== null);
        }));
        this.subscriptions.add(data.drag.released.subscribe(({ event }) => {
            if (event.type === 'touchcancel') {
                data.dropHandled = true;
                return;
            }
            const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
            if (pointer) void this.drop(data, { x: pointer.clientX, y: pointer.clientY });
        }));
    }

    private findHoveredAgenda(point: PanelPoint): Agenda.Row | null {
        if (!this.panel().contains(point)) return null;
        const target = document.elementFromPoint(point.x, point.y);
        const index = this.agendaCards().findIndex(card => target && card.nativeElement.contains(target));
        const agenda = this.agendas()?.[index] ?? null;
        return agenda?.id === this.lastDrag()?.data.agenda ? null : agenda;
    }

    private async drop(data: DragData<AgendaItem.Row>, point: PanelPoint): Promise<void> {
        if (data.dropHandled || !this.panel().contains(point)) return;
        // The panel owns even its padding/current-agenda row, not a cached list behind it.
        data.dropHandled = true;
        const agenda = this.findHoveredAgenda(point);
        if (!agenda) return;
        const preview = document.querySelector<HTMLElement>('.cdk-drag-preview');
        if (preview) {
            const box = preview.getBoundingClientRect();
            // shrink-out removes CDK's transform; freeze the preview so it shrinks where released.
            Object.assign(preview.style, { position: 'fixed', left: `${box.left}px`, top: `${box.top}px` });
            preview.classList.add('shrink-out');
        }
        await this.supabase.sync.from('agenda_item').update({ id: data.data.id, agenda: agenda.id });
    }

    private stopTracking(): void {
        this.subscriptions.unsubscribe();
        this.subscriptions = new Subscription();
        this.dragPosition.set(null);
        this.hoveredAgenda.set(null);
        document.querySelector('.cdk-drag-preview')?.classList.remove('shrink');
    }

    ngOnDestroy(): void {
        this.stopTracking();
    }
}

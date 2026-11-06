import { Agenda } from '@/modules/agenda/agenda';
import { AgendaItem } from '@/modules/agenda/item/agenda-item';
import { DragData } from '@/shared/service/drag-drop.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { CdkDrag, CdkDragMove, CdkDragRelease } from '@angular/cdk/drag-drop';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaDropZone } from './agenda-drop-zone';

describe('AgendaDropZone', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<AgendaDropZone>>;
    let moved: Subject<CdkDragMove>;
    let released: Subject<CdkDragRelease>;
    let data: DragData<AgendaItem.Row>;
    let cards: HTMLElement[];
    const update = vi.fn().mockResolvedValue(undefined);
    const hit = vi.fn();

    beforeEach(async () => {
        update.mockClear();
        hit.mockReset();
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
        TestBed.configureTestingModule({ providers: [{
            provide: SupabaseService,
            useValue: { sync: { from: () => ({ update, readAll: () => ({ get: async () => [
                { id: 1, name: 'Current', position: 0 }, { id: 2, name: 'Destination', position: 1 },
            ] as Agenda.Row[] }) }) } },
        }] });
        moved = new Subject();
        released = new Subject();
        const drag = { moved, released } as unknown as CdkDrag;
        data = { drag, data: { id: 8, agenda: 1 } as AgendaItem.Row, view: document.createElement('div') };
        fixture = TestBed.createComponent(AgendaDropZone);
        fixture.componentRef.setInput('draggedAgendaItem', data);
        await fixture.whenStable();
        await fixture.componentInstance['agendas'].asPromise();
        await fixture.whenStable();
        cards = Array.from(fixture.nativeElement.querySelectorAll('.card'));
        hit.mockReturnValue(cards[1]);
    });

    function release(type = 'mouseup'): void {
        const event = new MouseEvent(type, { clientX: 130, clientY: 250 });
        if (type.startsWith('touch')) Object.defineProperty(event, 'changedTouches', {
            value: [{ clientX: 130, clientY: 250 }],
        });
        released.next({ source: data.drag, event });
    }

    it.each(['mouseup', 'touchend'])('claims a %s release before the CDK list can write, using live hit testing', type => {
        // No move event: a panel can finish opening under a stationary pointer before release.
        release(type);
        expect(data.dropHandled).toBe(true);
        expect(update).toHaveBeenCalledExactlyOnceWith({ id: 8, agenda: 2 });
        release();
        expect(update).toHaveBeenCalledTimes(1);
    });

    it.each(['current agenda', 'padding'])('blocks a cached list drop over the %s without moving the item', target => {
        hit.mockReturnValue(target === 'padding' ? fixture.nativeElement.querySelector('.panel-card') : cards[0]);
        release();
        expect(update).not.toHaveBeenCalled();
        expect(data.dropHandled).toBe(true);
    });

    it('leaves drops outside the visible panel to CDK', () => {
        hit.mockReturnValue(document.body);
        release();
        expect(update).not.toHaveBeenCalled();
        expect(data.dropHandled).toBeUndefined();
    });

    it('freezes the preview before shrink-out removes its transform', () => {
        const preview = document.createElement('div');
        preview.className = 'cdk-drag-preview';
        preview.getBoundingClientRect = () => new DOMRect(130, 250, 100, 40);
        document.body.append(preview);
        try {
            release();
            expect(preview.style.left).toBe('130px');
            expect(preview.style.top).toBe('250px');
            expect(preview.classList.contains('shrink-out')).toBe(true);
        } finally {
            preview.remove();
        }
    });

    it.each(['touchcancel', 'Escape'])('does not write after %s, including the ordinary CDK drop', kind => {
        if (kind === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        release(kind === 'touchcancel' ? kind : 'mouseup');
        expect(update).not.toHaveBeenCalled();
        expect(data.dropHandled).toBe(true);
    });

    it('shows a peek only while an agenda item is being dragged', async () => {
        const panel: HTMLElement = fixture.nativeElement.querySelector('app-edge-panel');
        expect(panel.classList.contains('hidden')).toBe(false);
        fixture.componentRef.setInput('draggedAgendaItem', null);
        await fixture.whenStable();
        expect(panel.classList.contains('hidden')).toBe(true);
        expect(panel.hasAttribute('inert')).toBe(true);
        fixture.componentRef.setInput('draggedAgendaItem', data);
        await fixture.whenStable();
        expect(panel.classList.contains('hidden')).toBe(false);
    });

    it('unsubscribes and clears hover when the active drag is cleared', async () => {
        moved.next({ source: data.drag, pointerPosition: { x: 130, y: 250 } } as CdkDragMove);
        await fixture.whenStable();
        expect(cards[1].classList.contains('hover')).toBe(true);
        fixture.componentRef.setInput('draggedAgendaItem', null);
        await fixture.whenStable();
        release();
        expect(cards[1].classList.contains('hover')).toBe(false);
        expect(update).not.toHaveBeenCalled();
    });

    it('unsubscribes on destruction mid-drag', () => {
        fixture.destroy();
        release();
        expect(update).not.toHaveBeenCalled();
    });
});

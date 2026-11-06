import type { Board, BoardHousehold, BoardMember } from '@/modules/ministering/ministering-board';
import { MinisteringService } from '@/modules/ministering/ministering.service';
import { ProfileService } from '@/modules/profile/profile.service';
import { WindowService } from '@/shared/service/window.service';
import { EdgePanel, type PanelPoint } from '@/shared/widget/edge-panel/edge-panel';
import { PopoverService } from '@/shared/widget/popover/popover.service';
import type { CdkDrag, CdkDragDrop, CdkDragEnd, CdkDragMove, CdkDragRelease, CdkDropList } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from '../../shared/admin.service';
import { MinisteringPage } from './ministering-page';

type DraggedItem = ReturnType<MinisteringPage['dragMember']>;
type DropTarget = { kind: DraggedItem['kind']; id: number | null };
type DropEvent = CdkDragDrop<DropTarget, DropTarget, DraggedItem>;

const brother: BoardMember = {
    id: 1, first_name: 'Hans', last_name: 'Müller', nick_name: null,
    gender: 'male', can_minister: true, ministering_position: 0,
};
const household: BoardHousehold = {
    id: 10, name: 'Müller', color_1: 'red', color_2: 'blue', ministering_position: 0,
};
const points = {
    member: { x: 120, y: 150 },
    household: { x: 720, y: 150 },
    board: { x: 450, y: 150 },
};

function fakeDrag(data: DraggedItem) {
    const moved = new Subject<CdkDragMove<DraggedItem>>();
    const released = new Subject<CdkDragRelease<DraggedItem>>();
    const ended = new Subject<CdkDragEnd<DraggedItem>>();
    const dropped = new Subject<DropEvent>();
    const source = { data, moved, released, ended, dropped } as unknown as CdkDrag<DraggedItem>;
    return { source, moved, released, ended, dropped };
}

function dropEvent(source: CdkDrag<DraggedItem>, previousId: number | null = 20): DropEvent {
    return {
        item: source,
        previousContainer: { data: { kind: source.data.kind, id: previousId } } as CdkDropList<DropTarget>,
        container: { data: { kind: source.data.kind, id: 30 } } as CdkDropList<DropTarget>,
        previousIndex: 0,
        currentIndex: 2,
        isPointerOverContainer: true,
        distance: { x: 100, y: 0 },
        dropPoint: points.board,
        event: new MouseEvent('mouseup'),
    };
}

function release(drag: ReturnType<typeof fakeDrag>, point: PanelPoint, type = 'mouseup'): void {
    const event = type.startsWith('touch')
        ? new TouchEvent(type, { changedTouches: [{ clientX: point.x, clientY: point.y } as Touch] })
        : new MouseEvent(type, { clientX: point.x, clientY: point.y });
    drag.released.next({ source: drag.source, event });
}

describe('MinisteringPage edge-panel drop routing', () => {
    let fixture: ComponentFixture<MinisteringPage>;
    let page: MinisteringPage;
    const editMode = signal(true);
    const board = signal<Board>({ districts: [], unassignedBrothers: [], unassignedHouseholds: [] });
    const ministering = {
        board,
        placeMember: vi.fn<MinisteringService['placeMember']>().mockResolvedValue(undefined),
        placeHousehold: vi.fn<MinisteringService['placeHousehold']>().mockResolvedValue(undefined),
        placeCompanionship: vi.fn<MinisteringService['placeCompanionship']>().mockResolvedValue(undefined),
    };
    const hitTest = vi.fn<(x: number, y: number) => Element | null>();
    let originalHitTest: PropertyDescriptor | undefined;

    function expectNoWrite(): void {
        expect(ministering.placeMember).not.toHaveBeenCalled();
        expect(ministering.placeHousehold).not.toHaveBeenCalled();
        expect(ministering.placeCompanionship).not.toHaveBeenCalled();
    }

    function expectOnlyPlacement(kind: 'member' | 'household', id: number | null, index: number): void {
        const write = kind === 'member' ? ministering.placeMember : ministering.placeHousehold;
        expect(write).toHaveBeenCalledExactlyOnceWith(kind === 'member' ? brother.id : household.id, id, index);
        expect(kind === 'member' ? ministering.placeHousehold : ministering.placeMember).not.toHaveBeenCalled();
        expect(ministering.placeCompanionship).not.toHaveBeenCalled();
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        editMode.set(true);
        board.set({
            districts: [],
            unassignedBrothers: [{ ...brother, id: 2 }],
            unassignedHouseholds: [{ ...household, id: 11 }, { ...household, id: 12 }],
        });
        TestBed.configureTestingModule({
            imports: [MinisteringPage],
            providers: [
                { provide: MinisteringService, useValue: ministering },
                { provide: ProfileService, useValue: { own: signal(null) } },
                { provide: AdminService, useValue: { editMode } },
                { provide: WindowService, useValue: { currentRoute: signal('/callings/ministering') } },
                { provide: PopoverService, useValue: { bindRowPopoverRoute: () => new Subscription(), close: vi.fn() } },
                { provide: ActivatedRoute, useValue: {} },
                { provide: Router, useValue: { navigate: vi.fn() } },
            ],
        }).overrideComponent(MinisteringPage, {
            set: {
                imports: [EdgePanel],
                template: `
                    <app-edge-panel #brothersPanel storageKey="ministering-test-brothers" [dragPosition]="dragPosition()">
                        <span class="brother-content">Unassigned brothers</span>
                    </app-edge-panel>
                    <app-edge-panel #householdsPanel edge="right" storageKey="ministering-test-households" [dragPosition]="dragPosition()">
                        <span class="household-content">Unassigned households</span>
                    </app-edge-panel>`,
            },
        });
        fixture = TestBed.createComponent(MinisteringPage);
        page = fixture.componentInstance;
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        // jsdom has no layout hit testing; return real descendants of the two real EdgePanels.
        hitTest.mockImplementation((x, y) => {
            if (y < 100 || y > 400) return document.body;
            if (x >= 100 && x <= 300) return root.querySelector('.brother-content');
            if (x >= 700 && x <= 900) return root.querySelector('.household-content');
            return document.body;
        });
        originalHitTest = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hitTest });
    });

    afterEach(() => {
        fixture.destroy();
        if (originalHitTest) Object.defineProperty(document, 'elementFromPoint', originalHitTest);
        else Reflect.deleteProperty(document, 'elementFromPoint');
        vi.restoreAllMocks();
    });

    for (const kind of ['member', 'household'] as const) {
        function startDrag() {
            const drag = fakeDrag(kind === 'member' ? page['dragMember'](brother) : page['dragHousehold'](household));
            page['onDragStarted']({ source: drag.source, event: new MouseEvent('mousedown') });
            return drag;
        }

        it.each(['mouseup', 'touchend'])(`writes once to the ${kind} tray on %s instead of the cached companionship behind it`, type => {
            const drag = startDrag();
            release(drag, points[kind], type);
            drag.dropped.next(dropEvent(drag.source));

            expectOnlyPlacement(kind, null, kind === 'member' ? 1 : 2);
            expect(page['dragged']()).toBeNull();
            expect(page['dragPosition']()).toBeNull();
        });

        it(`retains the ${kind} release snapshot through ended and post-animation geometry changes`, async () => {
            const drag = startDrag();
            drag.moved.next({
                source: drag.source, pointerPosition: points[kind], event: new MouseEvent('mousemove'),
                distance: { x: 50, y: 0 }, delta: { x: 1, y: 0 },
            });
            await fixture.whenStable();
            release(drag, points[kind]);
            drag.ended.next({ source: drag.source, distance: { x: 50, y: 0 }, dropPoint: points[kind], event: new MouseEvent('mouseup') });
            hitTest.mockReturnValue(document.body);
            await fixture.whenStable();
            expectNoWrite();
            drag.dropped.next(dropEvent(drag.source));

            expectOnlyPlacement(kind, null, kind === 'member' ? 1 : 2);
        });

        it(`does not fall through to a cached companionship when a ${kind} lands on the incompatible tray`, () => {
            const drag = startDrag();
            release(drag, points[kind === 'member' ? 'household' : 'member']);
            drag.dropped.next(dropEvent(drag.source));
            expectNoWrite();
        });

        it(`does not write when the ${kind} is already unassigned`, () => {
            board.update(value => ({
                ...value,
                unassignedBrothers: [...value.unassignedBrothers, brother],
                unassignedHouseholds: [...value.unassignedHouseholds, household],
            }));
            const drag = startDrag();
            release(drag, points[kind]);
            drag.dropped.next(dropEvent(drag.source, null));
            expectNoWrite();
        });

        it(`places a ${kind} from its tray into a companionship normally`, () => {
            board.update(value => ({
                ...value,
                unassignedBrothers: [...value.unassignedBrothers, brother],
                unassignedHouseholds: [...value.unassignedHouseholds, household],
            }));
            const drag = startDrag();
            release(drag, points.board);
            drag.dropped.next(dropEvent(drag.source, null));
            expectOnlyPlacement(kind, 30, 2);
        });

        it(`ignores touchcancel over the ${kind} tray even if CDK reports a valid companionship`, () => {
            const drag = startDrag();
            release(drag, points[kind], 'touchcancel');
            drag.dropped.next(dropEvent(drag.source));
            expectNoWrite();
            expect(page['dragged']()).toBeNull();
            expect(page['dragPosition']()).toBeNull();
        });

        it.each(['tray', 'companionship'] as const)(`latches Escape before a ${kind} release over a %s`, destination => {
            const drag = startDrag();
            const root: HTMLElement = fixture.nativeElement;
            root.querySelector(kind === 'member' ? '.brother-content' : '.household-content')!
                .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            release(drag, destination === 'tray' ? points[kind] : points.board);
            drag.dropped.next(dropEvent(drag.source));
            expectNoWrite();

            const nextDrag = startDrag();
            release(nextDrag, points.board);
            nextDrag.dropped.next(dropEvent(nextDrag.source));
            expectOnlyPlacement(kind, 30, 2);
        });

        it.each(['tray', 'companionship'] as const)(`does not place a ${kind} in a %s after edit mode is disabled`, destination => {
            const drag = startDrag();
            editMode.set(false);
            release(drag, destination === 'tray' ? points[kind] : points.board);
            drag.dropped.next(dropEvent(drag.source));
            expectNoWrite();
        });

        it(`does not write a ${kind} after destruction mid-drag`, () => {
            const drag = startDrag();
            release(drag, points[kind]);
            fixture.destroy();
            drag.dropped.next(dropEvent(drag.source));
            expectNoWrite();
        });
    }
});

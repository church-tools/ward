import type { BoardCompanionship, BoardHousehold, BoardMember } from '@/modules/ministering/ministering-board';
import { MinisteringService } from '@/modules/ministering/ministering.service';
import { ProfileService } from '@/modules/profile/profile.service';
import { RowCardList } from '@/modules/shared/row-card-list/row-card-list';
import type { Insert, Table } from '@/modules/shared/table.types';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { Button } from '@/shared/form/button/button';
import LinkButton from '@/shared/form/button/link/link-button';
import { TextInput } from '@/shared/form/text/text-input';
import { Icon } from '@/shared/icon/icon';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import type { PromiseOrValue } from '@/shared/types';
import { xcomputed, xeffect } from '@/shared/utils/signal-utils';
import { Chip } from '@/shared/widget/chip/chip';
import { EdgePanel, PanelPoint } from '@/shared/widget/edge-panel/edge-panel';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragStart, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fromEvent, Subscription } from 'rxjs';
import { PrivatePage } from '../../shared/private-page';
import { MinisteringImportPage } from './import/ministering-import-page';

type DraggedItem =
    | { kind: 'member'; value: BoardMember }
    | { kind: 'household'; value: BoardHousehold }
    | { kind: 'area'; value: BoardCompanionship['area'] };

type DropTarget = { kind: DraggedItem['kind']; id: number | null };
type DropEvent = CdkDragDrop<DropTarget>;

@Component({
    selector: 'app-ministering-page',
    templateUrl: './ministering-page.html',
    styleUrl: './ministering-page.scss',
    imports: [LocalizePipe, TextInput, AsyncButton, Button, Icon, Chip, RowCardList,
        CdkDrag, CdkDropList, CdkDropListGroup, CdkDragHandle, LinkButton, EdgePanel, RouterLink],
    host: { class: 'full-width' },
})
export class MinisteringPage extends PrivatePage {

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly ministering = inject(MinisteringService);
    private readonly profileService = inject(ProfileService);

    /** The `/import` child route renders nothing: this is what turns that URL into the overlay. */
    private readonly importOpen = xcomputed([this.windowService.currentRoute],
        route => route === '/callings/ministering/import');

    private readonly popoverRouteSubscription: Subscription;

    constructor() {
        super();
        this.popoverRouteSubscription = this.popoverService.bindRowPopoverRoute(this.route);
        xeffect([this.importOpen], importOpen => {
            if (importOpen)
                void this.popoverService.open(MinisteringImportPage, () => this.navigateHere());
        });
    }

    override ngOnDestroy() {
        this.dragSubscriptions.unsubscribe();
        this.popoverRouteSubscription.unsubscribe();
        super.ngOnDestroy();
    }

    protected readonly board = this.ministering.board;

    protected readonly districtQuery = {
        query: (table: Table<'ministering_district'>) => table.readAll(),
        id: 'ministering_districts',
    };

    protected companionshipsOf(districtId: number) {
        return this.board().districts.find(group => group.district.id === districtId)?.companionships ?? [];
    }

    protected readonly dragMember = (member: BoardMember): DraggedItem => ({ kind: 'member', value: member });
    protected readonly dragHousehold = (household: BoardHousehold): DraggedItem => ({ kind: 'household', value: household });
    protected readonly dragArea = (area: BoardCompanionship['area']): DraggedItem => ({ kind: 'area', value: area });

    protected readonly acceptsMember = (drag: CdkDrag) => kindOf(drag) === 'member';
    protected readonly acceptsHousehold = (drag: CdkDrag) => kindOf(drag) === 'household';
    protected readonly acceptsArea = (drag: CdkDrag) => kindOf(drag) === 'area';
    // CDK caches list rectangles before the panels slide; trays are sources, never CDK targets.
    protected readonly acceptsNothing = () => false;
    private readonly brothersPanel = viewChild.required<EdgePanel>('brothersPanel');
    private readonly householdsPanel = viewChild.required<EdgePanel>('householdsPanel');
    private dragSubscriptions = new Subscription();
    protected readonly dragged = signal<DraggedItem | null>(null);
    protected readonly dragPosition = signal<PanelPoint | null>(null);
    protected readonly hoveredTray = computed(() => {
        const point = this.dragPosition();
        const kind = point ? this.trayAt(point) : null;
        return kind === this.dragged()?.kind ? kind : null;
    });

    protected onDragStarted({ source }: CdkDragStart): void {
        this.dragSubscriptions.unsubscribe();
        this.dragSubscriptions = new Subscription();
        this.dragged.set(source.data as DraggedItem);
        let releasedTray: 'member' | 'household' | null = null;
        let cancelled = false;
        this.dragSubscriptions.add(fromEvent<KeyboardEvent>(document, 'keydown', { capture: true }).subscribe(event => {
            if (event.key === 'Escape') cancelled = true;
        }));
        this.dragSubscriptions.add(source.moved.subscribe(event => {
            this.dragPosition.set({ x: event.pointerPosition.x - window.scrollX, y: event.pointerPosition.y - window.scrollY });
        }));
        this.dragSubscriptions.add(source.released.subscribe(({ event }) => {
            cancelled ||= event.type === 'touchcancel';
            const pointer = 'changedTouches' in event ? event.changedTouches[0] : event;
            releasedTray = pointer ? this.trayAt({ x: pointer.clientX, y: pointer.clientY }) : null;
        }));
        this.dragSubscriptions.add(source.dropped.subscribe(event => {
            try {
                if (!cancelled) this.onDrop(event as DropEvent, releasedTray);
            } finally {
                this.dragged.set(null);
                this.dragPosition.set(null);
                this.dragSubscriptions.unsubscribe();
            }
        }));
    }

    private trayAt(point: PanelPoint): 'member' | 'household' | null {
        if (this.brothersPanel().contains(point)) return 'member';
        if (this.householdsPanel().contains(point)) return 'household';
        return null;
    }

    protected readonly memberPopoverUrl = (member: BoardMember) =>
        this.popoverService.getRowPopoverUrl(this.route, 'member', member.id);

    protected memberName(member: BoardMember): string {
        return `${member.nick_name || member.first_name} ${member.last_name ?? ''}`.trim();
    }

    private onDrop(event: DropEvent, tray: 'member' | 'household' | null): void {
        const dragged = event.item.data as DraggedItem;
        if (!this.adminService.editMode()) return;
        // The visible panel wins over any cached CDK rectangle behind it. Exactly one write follows.
        if (tray) {
            if (dragged.kind !== tray) return;
            if (dragged.kind === 'member' && !this.board().unassignedBrothers.some(row => row.id === dragged.value.id))
                void this.ministering.placeMember(dragged.value.id, null, this.board().unassignedBrothers.length);
            if (dragged.kind === 'household' && !this.board().unassignedHouseholds.some(row => row.id === dragged.value.id))
                void this.ministering.placeHousehold(dragged.value.id, null, this.board().unassignedHouseholds.length);
            return;
        }
        const target = event.container.data;
        if (!event.isPointerOverContainer || !target || target.id === null
            || target.kind !== dragged.kind || isSameSpot(event)) return;
        if (dragged.kind === 'member')
            void this.ministering.placeMember(dragged.value.id, target.id, event.currentIndex);
        else if (dragged.kind === 'household')
            void this.ministering.placeHousehold(dragged.value.id, target.id, event.currentIndex);
        else
            void this.ministering.placeCompanionship(dragged.value.id, target.id, event.currentIndex);
    }

    protected readonly enableEditMode = async () => this.adminService.setEditMode(true);

    protected navigateHere() {
        this.router.navigate(['.'], { relativeTo: this.route, replaceUrl: true });
    }

    protected readonly newDistrictName = signal('');
    private readonly unit = computed(() => this.profileService.own()?.unit);
    protected readonly canInsertDistrict = computed(() => !!this.unit() && !!this.newDistrictName().trim());

    /** `prepareInsert` is the list's own hook: it appends the position from the last card. */
    protected async insertDistrict(
        insert: (row: Insert<'ministering_district'>) => PromiseOrValue<void>,
        prepareInsert: (row: Insert<'ministering_district'>) => PromiseOrValue<void>,
    ) {
        const unit = this.unit();
        const name = this.newDistrictName().trim();
        if (!unit || !name) return;
        const row: Insert<'ministering_district'> = { unit, name };
        await prepareInsert(row);
        this.newDistrictName.set('');
        await insert(row);
    }

    protected renameDistrict(districtId: number, name: string | null) {
        return this.ministering.renameDistrict(districtId, name ?? '');
    }

    protected readonly addCompanionship = async (districtId: number) => this.ministering.addCompanionship(districtId);
    protected readonly removeCompanionship = async (areaId: number) => this.ministering.removeCompanionship(areaId);
}

function kindOf(drag: CdkDrag): DraggedItem['kind'] | null {
    return (drag.data as DraggedItem | undefined)?.kind ?? null;
}

function isSameSpot(event: DropEvent): boolean {
    return event.previousContainer === event.container && event.previousIndex === event.currentIndex;
}

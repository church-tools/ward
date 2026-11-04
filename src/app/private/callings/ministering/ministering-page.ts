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
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PrivatePage } from '../../shared/private-page';
import { MinisteringImportPage } from './import/ministering-import-page';

type DraggedItem =
    | { kind: 'member'; value: BoardMember }
    | { kind: 'household'; value: BoardHousehold }
    | { kind: 'area'; value: BoardCompanionship['area'] };

type DropEvent = CdkDragDrop<unknown>;

@Component({
    selector: 'app-ministering-page',
    templateUrl: './ministering-page.html',
    styleUrl: './ministering-page.scss',
    imports: [LocalizePipe, TextInput, AsyncButton, Button, Icon, Chip, RowCardList,
        CdkDrag, CdkDropList, CdkDropListGroup, CdkDragHandle, LinkButton],
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

    constructor() {
        super();
        xeffect([this.importOpen], importOpen => {
            if (importOpen)
                void this.popoverService.open(MinisteringImportPage, () => this.navigateHere());
        });
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

    protected memberName(member: BoardMember): string {
        return `${member.nick_name || member.first_name} ${member.last_name ?? ''}`.trim();
    }

    /** `areaId` is null for a tray: dropping there means "no companionship". */
    protected onMemberDrop(event: DropEvent, areaId: number | null) {
        const dragged = event.item.data as DraggedItem | undefined;
        if (dragged?.kind !== 'member' || isSameSpot(event)) return;
        void this.ministering.placeMember(dragged.value.id, areaId, event.currentIndex);
    }

    protected onHouseholdDrop(event: DropEvent, areaId: number | null) {
        const dragged = event.item.data as DraggedItem | undefined;
        if (dragged?.kind !== 'household' || isSameSpot(event)) return;
        void this.ministering.placeHousehold(dragged.value.id, areaId, event.currentIndex);
    }

    protected onAreaDrop(event: DropEvent, districtId: number) {
        const dragged = event.item.data as DraggedItem | undefined;
        if (dragged?.kind !== 'area' || isSameSpot(event)) return;
        void this.ministering.placeCompanionship(dragged.value.id, districtId, event.currentIndex);
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

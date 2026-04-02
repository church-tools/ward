import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { SacramentMeetingItem, SacramentMeetingItemKind } from '@/modules/sacrament-meeting/item/sacrament-meeting-item';
import { SacramentMeetingItemList } from '@/modules/sacrament-meeting/item/sacrament-meeting-item-list';
import { SacramentMeetingViewService } from '@/modules/sacrament-meeting/sacrament-meeting-view.service';
import { CustomRowSelect } from '@/shared/form/row-select/custom-row-select';
import { MultiSelect } from '@/shared/form/select/multi-select';
import { Select } from '@/shared/form/select/select';
import { SundayIndex, sundayIndexToDate } from '@/shared/utils/date-utils';
import { createTranslateLocaleSignal } from '@/shared/utils/language-utils';
import { xcomputed, xeffect } from '@/shared/utils/signal-utils';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { RowHistory } from '../../shared/row-history';
import { RowPage } from '../../shared/row-page';
import { SacramentMeetingItemPopover } from './sacrament-meeting-item-popover';

@Component({
    selector: 'app-sacrament-meeting-page',
    template: `
        <h2>
            @if (meetingDate(); as date) {
                {{ date | date : 'dd MMM yyyy' : undefined : locale() }}
            } @else {
                {{ title() }}
            }
        </h2>
        <div class="column-grid">
            <app-select class="col-md-8"
                [syncedRow]="syncedRow" column="type"
                [options]="meetingView.typeOptions" translateOptions
                label="{{ 'SACRAMENT_MEETING_PAGE.TYPE' | translate }}"/>

            <app-custom-row-select class="col-md-6"
                [syncedRow]="syncedRow" column="opening_prayer"
                table="member"
                label="{{ 'SACRAMENT_MEETING_PAGE.OPENING_PRAYER' | translate }}"/>

            <app-custom-row-select class="col-md-6"
                [syncedRow]="syncedRow" column="closing_prayer"
                table="member"
                label="{{ 'SACRAMENT_MEETING_PAGE.CLOSING_PRAYER' | translate }}"/>

            <app-multi-select class="col-12"
                [syncedRow]="syncedRow" column="classes"
                [options]="meetingView.classOptions"
                [optionValuesByValue]="meetingView.classOptionsByClass"
                [allowCustomText]="true"
                [customValueExclusive]="true"
                translateOptions
                label="{{ 'SACRAMENT_MEETING_PAGE.CLASSES' | translate }}"/>
        </div>

        @if (syncedRow.value(); as row) {
            <div class="column gap-2">
                <h3>{{ 'SACRAMENT_MEETING_ITEM.ITEMS' | translate }}</h3>
                <app-sacrament-meeting-item-list
                    [meetingId]="row.id"
                    [activeItemId]="activeItemId()"
                    [onItemClick]="onItemClick"/>
            </div>
        }

        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    imports: [TranslateModule, SyncedFieldDirective, Select,
        MultiSelect, CustomRowSelect, DatePipe, RowHistory, SacramentMeetingItemList],
    host: { class: 'page narrow full-height' },
})
export class SacramentMeetingPage extends RowPage<'sacrament_meeting'> {

    protected readonly tableName = 'sacrament_meeting';
    protected readonly meetingView = inject(SacramentMeetingViewService);
    protected readonly translate = inject(TranslateService);

    private readonly queryParamMap = toSignal(this.route.queryParamMap,
        { initialValue: this.route.snapshot.queryParamMap });

    protected readonly locale = createTranslateLocaleSignal(this.translate);

    protected readonly meetingDate = xcomputed([this.syncedRow.value], row =>
        row ? sundayIndexToDate(row.week as SundayIndex) : null);

    protected readonly activeItemId = xcomputed([this.queryParamMap], queryParams => {
        if (queryParams.get('popover') !== 'sacrament_meeting_item')
            return null;
        const id = Number(queryParams.get('id'));
        return Number.isInteger(id) && id > 0 ? id : null;
    });

    protected readonly activeItemKind = xcomputed([this.queryParamMap], queryParams => {
        const kind = queryParams.get('itemType');
        if (kind === 'talk' || kind === 'hymn' || kind === 'musical_performance')
            return kind;
        return null;
    });

    private openedPopoverItemId: number | null = null;
    private openedPopoverItemKind: SacramentMeetingItemKind | null = null;

    constructor() {
        super();
        xeffect([this.activeItemId, this.syncedRow.value], (itemId, meeting) => {
            void this.syncItemPopover(itemId, meeting?.id ?? null);
        });
    }

    protected readonly onItemClick = (item: SacramentMeetingItem) => {
        const activeItemId = this.activeItemId();
        const activeItemKind = this.activeItemKind();
        if (activeItemId === item.id && activeItemKind === item.kind) {
            void this.clearItemPopoverQuery();
            return;
        }
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                popover: 'sacrament_meeting_item',
                id: item.id,
                itemType: item.kind,
            },
            queryParamsHandling: 'merge',
        });
    }

    private async syncItemPopover(itemId: number | null, meetingId: number | null) {
        const itemKind = this.activeItemKind();
        if (itemId === null) {
            this.openedPopoverItemId = null;
            this.openedPopoverItemKind = null;
            await this.popoverService.close();
            return;
        }
        if (meetingId == null || !itemKind)
            return;

        if (itemId === this.openedPopoverItemId && itemKind === this.openedPopoverItemKind)
            return;

        const item = await this.getItemByKind(itemKind, itemId);
        if (!item || item.sacrament_meeting !== meetingId) {
            await this.clearItemPopoverQuery();
            return;
        }

        const popover = await this.popoverService.open(SacramentMeetingItemPopover,
            () => void this.clearItemPopoverQuery());
        popover.instance.itemId.set(itemId);
        popover.instance.kind.set(itemKind);
        this.openedPopoverItemId = itemId;
        this.openedPopoverItemKind = itemKind;
    }

    private async getItemByKind(kind: SacramentMeetingItemKind, id: number) {
        switch (kind) {
            case 'talk': return this.supabase.sync.from('message').read(id).get();
            case 'hymn': return this.supabase.sync.from('singing').read(id).get();
            case 'musical_performance': return this.supabase.sync.from('musical_performance').read(id).get();
        }
    }

    private async clearItemPopoverQuery() {
        await this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { popover: null, id: null, itemType: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }
}

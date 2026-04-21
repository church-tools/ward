import { HymnTitleService } from '@/modules/sacrament-meeting/item/hymn/hymn-title.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { HoverNudgeDirective } from '@/shared/utils/hover-nudge.directive';
import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { xcomputed } from '../../shared/utils/signal-utils';
import { Icon } from "@/shared/icon/icon";

export type FixedHymnSlot = 'opening' | 'sacrament' | 'closing';

@Component({
    selector: 'app-fixed-hymn-card',
    template: `
        <a class="card stealth canvas-card suppress-canvas-card-animation selectable-card fixed-hymn-card"
            appHoverNudge [hoverNudgeDistance]="1"
            [routerLink]="url()"
            [routerLinkActive]="[]"
            [routerLinkActiveOptions]="{ exact: true }"
            #activeLink="routerLinkActive"
            (click)="activeLink.isActive ? null :$event.stopPropagation()">
            @if (activeLink.isActive) {
                <div class="indicator accent-fg"></div>
            }
            <div class="row grow-1 m-2-3 row-gap-1 column-gap-2 items-center">
                <app-icon icon="music_note_1" filled size="xs" class="subtle-text"/>
                @if (hymnNumber(); as number) {
                    <span class="overflow-ellipsis">#{{ number }} {{ localizeHymn()(number) }}</span>
                } @else {
                    <span class="subtle-text">{{ labelKey() | localize }}</span>
                }
            </div>
        </a>
    `,
    styleUrl: './fixed-hymn-card.scss',
    imports: [LocalizePipe, RouterLink, RouterLinkActive, HoverNudgeDirective, Icon],
})
export class FixedHymnCard {

    private readonly hymnTitle = inject(HymnTitleService);

    readonly slot = input.required<FixedHymnSlot>();
    readonly meetingId = input.required<number>();
    readonly hymnNumber = input<number | null>(null);
    readonly labelKey = input.required<string>();

    protected readonly localizeHymn = xcomputed([this.hymnTitle.localizer], localizer => localizer);

    protected readonly url = xcomputed([this.slot, this.meetingId], (slot, meetingId) =>
        `/sacrament-meeting/planning/fixed-hymn/${slot}-${meetingId}`);
}
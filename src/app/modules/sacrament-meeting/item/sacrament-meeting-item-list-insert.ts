import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Button } from '@/shared/form/button/button';
import type { SacramentMeetingItemCard, SacramentMeetingItemKind } from './sacrament-meeting-item';

@Component({
    selector: 'app-sacrament-meeting-item-list-insert',
    standalone: true,
    template: `
        <div class="row gap-2 full-width center-content">
            <app-button type="secondary" size="large"
                (onClick)="insertKind('talk')">
                {{ 'SACRAMENT_MEETING_ITEM.KIND_TALK' | translate }}
            </app-button>
            <app-button type="secondary" size="large"
                (onClick)="insertKind('hymn')">
                {{ 'SACRAMENT_MEETING_ITEM.KIND_HYMN' | translate }}
            </app-button>
            <app-button type="secondary" size="large"
                (onClick)="insertKind('musical_performance')">
                {{ 'SACRAMENT_MEETING_ITEM.KIND_MUSICAL_PERFORMANCE' | translate }}
            </app-button>
        </div>
    `,
    imports: [TranslateModule, Button],
})
export class SacramentMeetingItemListInsert {

    readonly insert = input.required<(item: SacramentMeetingItemCard) => Promise<void>>();

    protected insertKind(kind: SacramentMeetingItemKind) {
        const draft: SacramentMeetingItemCard = {
            kind,
            table: kind === 'talk' ? 'message' : kind === 'hymn' ? 'singing' : 'musical_performance',
            id: -Date.now(),
            draft: true,
        };
        void this.insert()(draft);
    }
}

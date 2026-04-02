import { Component, inject, OnDestroy, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AsyncButton } from '@/shared/form/button/async/async-button';
import { RowSelect } from '@/shared/form/row-select/row-select';
import { TextInput } from '@/shared/form/text/text-input';
import type { SacramentMeetingItemKind } from '@/modules/sacrament-meeting/item/sacrament-meeting-item';
import { SupabaseService } from '@/shared/service/supabase.service';
import { xcomputed } from '@/shared/utils/signal-utils';
import { SupaSyncedRow } from '@/shared/utils/supa-sync/supa-synced-row';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { PopoverPage } from '@/shared/widget/popover/popover';

@Component({
    selector: 'app-sacrament-meeting-item-popover',
    standalone: true,
    template: `
        <div class="m-4-6 column gap-4 max-width-128">
            <h2>{{ titleKey() | translate }}</h2>

            @if (kind() === 'talk' && messageRow.value()) {
                <app-text-input [syncedRow]="messageRow" column="speaker"
                    label="{{ 'SACRAMENT_MEETING_ITEM.SPEAKER' | translate }}"/>
                <app-text-input [syncedRow]="messageRow" column="topic"
                    label="{{ 'SACRAMENT_MEETING_ITEM.TOPIC' | translate }}"/>
                <app-text-input [syncedRow]="messageRow" column="duration"
                    label="{{ 'SACRAMENT_MEETING_ITEM.DURATION' | translate }}"/>
            } @else if (kind() === 'hymn' && singingRow.value()) {
                <app-row-select [syncedRow]="singingRow" column="hymn"
                    table="hymn" [hideClear]="false"
                    label="{{ 'SACRAMENT_MEETING_ITEM.HYMN' | translate }}"/>
            } @else if (kind() === 'musical_performance' && musicalRow.value()) {
                <app-text-input [syncedRow]="musicalRow" column="name"
                    label="{{ 'SACRAMENT_MEETING_ITEM.NAME' | translate }}"/>
                <app-text-input [syncedRow]="musicalRow" column="performers"
                    label="{{ 'SACRAMENT_MEETING_ITEM.PERFORMERS' | translate }}"/>
            }

            <div class="row end-content mt-2">
                <app-async-button type="secondary" icon="delete" [onClick]="deleteItem">
                    {{ 'DELETE' | translate }}
                </app-async-button>
            </div>
        </div>
    `,
    imports: [TranslateModule, TextInput, RowSelect, SyncedFieldDirective, AsyncButton],
})
export class SacramentMeetingItemPopover extends PopoverPage implements OnDestroy {

    private readonly supabase = inject(SupabaseService);

    readonly itemId = signal<number | null>(null);
    readonly kind = signal<SacramentMeetingItemKind>('talk');

    private readonly messageId = xcomputed([this.itemId, this.kind],
        (itemId, kind) => kind === 'talk' ? itemId : null);
    private readonly singingId = xcomputed([this.itemId, this.kind],
        (itemId, kind) => kind === 'hymn' ? itemId : null);
    private readonly musicalId = xcomputed([this.itemId, this.kind],
        (itemId, kind) => kind === 'musical_performance' ? itemId : null);

    readonly messageRow = SupaSyncedRow.fromId(this.supabase.sync, () => 'message', this.messageId);
    readonly singingRow = SupaSyncedRow.fromId(this.supabase.sync, () => 'singing', this.singingId);
    readonly musicalRow = SupaSyncedRow.fromId(this.supabase.sync, () => 'musical_performance', this.musicalId);

    readonly titleKey = xcomputed([this.kind], kind => {
        switch (kind) {
            case 'hymn': return 'SACRAMENT_MEETING_ITEM.KIND_HYMN';
            case 'musical_performance': return 'SACRAMENT_MEETING_ITEM.KIND_MUSICAL_PERFORMANCE';
            case 'talk':
            default: return 'SACRAMENT_MEETING_ITEM.KIND_TALK';
        }
    });

    protected deleteItem = async () => {
        const id = this.itemId();
        if (!id) return;
        switch (this.kind()) {
            case 'talk': {
                const row = this.messageRow.value();
                if (!row) return;
                await this.supabase.sync.from('message').delete(row);
                break;
            }
            case 'hymn': {
                const row = this.singingRow.value();
                if (!row) return;
                await this.supabase.sync.from('singing').delete(row);
                break;
            }
            case 'musical_performance': {
                const row = this.musicalRow.value();
                if (!row) return;
                await this.supabase.sync.from('musical_performance').delete(row);
                break;
            }
        }
        await this.closePopup();
    }

    ngOnDestroy() {
        this.messageRow.destroy();
        this.singingRow.destroy();
        this.musicalRow.destroy();
    }
}

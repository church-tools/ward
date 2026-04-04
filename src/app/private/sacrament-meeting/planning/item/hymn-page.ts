import { HymnViewService } from '@/modules/sacrament-meeting/item/hymn/hymn-view.service';
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-hymn-page',
    template: `
        <h2>
            <span class="text-secondary">{{ 'VIEW.HYMN' | translate }}:</span>
            {{ hymnView.toString(syncedRow.value()!) }}
        </h2>
        <div class="column-grid">
            <app-text-input [syncedRow]="syncedRow" column="number"
                class="col-md-4"
                [pattern]="numberPattern"
                [mapIn]="numberToString"
                [mapOut]="stringToNumber"
                label="{{ 'HYMN_PAGE.NUMBER' | translate }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, SyncedFieldDirective, TextInput, RowHistory],
})
export class HymnPage extends RowPage<'hymn'> {

    protected readonly tableName = 'hymn';
    protected readonly hymnView = inject(HymnViewService);

    protected readonly numberPattern = [/^[0-9]*$/];

    protected readonly numberToString = (value: number | null) =>
        value == null ? '' : String(value);

    protected readonly stringToNumber = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed))
            return null;
        return Math.round(parsed);
    }

}

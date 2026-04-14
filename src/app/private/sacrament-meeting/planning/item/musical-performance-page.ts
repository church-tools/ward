import { MusicalPerformanceViewService } from '@/modules/sacrament-meeting/item/musical-performance/musical-performance-view.service';
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-musical-performance-page',
    template: `
        @let row = syncedRow.value();
        <h2>
            <span class="text-secondary">{{ 'VIEW.MUSICAL_PERFORMANCE' | localize }}:</span>
            {{ row ? musicalPerformanceView.toString(row) : '' }}
        </h2>
        <div class="column-grid">
            <app-text-input [syncedRow]="syncedRow" column="name"
                class="col-12"
                label="{{ 'MUSICAL_PERFORMANCE_PAGE.NAME' | localize }}"/>
            <app-text-input [syncedRow]="syncedRow" column="performers"
                class="col-12"
                label="{{ 'MUSICAL_PERFORMANCE_PAGE.PERFORMERS' | localize }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, TextInput, RowHistory],
})
export class MusicalPerformancePage extends RowPage<'musical_performance'> {

    protected readonly tableName = 'musical_performance';
    protected readonly musicalPerformanceView = inject(MusicalPerformanceViewService);

}

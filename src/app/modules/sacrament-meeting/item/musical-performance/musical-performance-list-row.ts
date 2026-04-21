import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { MusicalPerformanceViewService } from './musical-performance-view.service';

@Component({
    selector: 'app-musical-performance-list-row',
    template: `
        <div class="row full-width m-4 row-gap-1 column-gap-2 items-center">
            <app-icon [icon]="musicalPerformanceView.icon" size="sm" class="subtle-text"/>
            <h4 class="overflow-ellipsis">{{ musicalPerformanceView.toString(row()) }}</h4>
            @if (row().performers; as performers) {
                <span class="small-text subtle-text overflow-ellipsis">{{ performers }}</span>
            }
        </div>
    `,
    imports: [Icon],
})
export class MusicalPerformanceListRow extends ListRow<'musical_performance'> {

    protected readonly musicalPerformanceView = inject(MusicalPerformanceViewService);

    readonly dense = input(false, { transform: booleanAttribute });

}

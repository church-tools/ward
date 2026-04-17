import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { xcomputed } from '@/shared/utils/signal-utils';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { HymnTitleService } from './hymn-title.service';
import { HymnViewService } from './hymn-view.service';

@Component({
    selector: 'app-hymn-list-row',
    standalone: true,
    template: `
        <div class="row full-width {{ dense() ? 'm-2-3 column-gap-1' : 'm-4 column-gap-2' }} row-gap-1 column-gap-2 items-center">
            @if (dense()) {
                <app-icon [icon]="hymnView.icon" size="ns" class="text-secondary" filled/>
                <span class="overflow-ellipsis">#{{ row().number }} {{ title() }}</span>
            } @else {
                <app-icon [icon]="hymnView.icon" size="sm" class="text-secondary" filled/>
                <h4 class="overflow-ellipsis">#{{ row().number }}{{ title() }}</h4>
            }
        </div>
    `,
    imports: [Icon],
})
export class HymnListRow extends ListRow<'hymn'> {

    protected readonly hymnView = inject(HymnViewService);
    protected readonly hymnTitle = inject(HymnTitleService);

    protected readonly title = xcomputed([this.row, this.hymnTitle.localizer], (row, localizer) =>
        row.number ? localizer(row.number) : '');

    readonly dense = input(false, { transform: booleanAttribute });

}
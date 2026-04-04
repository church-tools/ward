import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { Component, inject } from '@angular/core';
import { HymnViewService } from './hymn-view.service';

@Component({
    selector: 'app-hymn-list-row',
    standalone: true,
    template: `
        <div class="row full-width m-4 row-gap-1 column-gap-2 items-center">
            <app-icon [icon]="hymnView.icon" size="sm" class="text-secondary"/>
            <h4 class="overflow-ellipsis">{{ hymnView.toString(row()) }}</h4>
        </div>
    `,
    imports: [Icon],
})
export class HymnListRow extends ListRow<'hymn'> {

    protected readonly hymnView = inject(HymnViewService);

}
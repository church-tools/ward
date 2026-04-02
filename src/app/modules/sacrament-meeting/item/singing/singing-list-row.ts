import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { Component, inject } from '@angular/core';
import { SingingViewService } from './singing-view.service';

@Component({
    selector: 'app-singing-list-row',
    standalone: true,
    template: `
        <div class="row full-width m-4 row-gap-1 column-gap-2 items-center">
            <app-icon [icon]="singingView.icon" size="sm" class="text-secondary"/>
            <h4 class="overflow-ellipsis">{{ singingView.toString(row()) }}</h4>
        </div>
    `,
    imports: [Icon],
})
export class SingingListRow extends ListRow<'singing'> {

    protected readonly singingView = inject(SingingViewService);

}
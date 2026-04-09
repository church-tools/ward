import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { MessageViewService } from './message-view.service';

@Component({
    selector: 'app-message-list-row',
    template: `
        <div class="row full-width {{ dense() ? 'm-2-3 column-gap-1' : 'm-4 column-gap-2' }} row-gap-1 items-center">
            @if (dense()) {
                <app-icon [icon]="messageView.icon" size="ns" class="text-secondary" filled/>
                <span class="overflow-ellipsis">{{ messageView.toString(row()) }}</span>
            } @else {
                <app-icon [icon]="messageView.icon" size="sm" class="text-secondary" filled/>
                <h4 class="overflow-ellipsis">{{ messageView.toString(row()) }}</h4>
            }
            @if (row().duration; as duration) {
                <span class="small-text text-secondary">{{ duration }}</span>
            }
        </div>
    `,
    imports: [Icon],
})
export class MessageListRow extends ListRow<'message'> {

    protected readonly messageView = inject(MessageViewService);

    readonly dense = input(false, { transform: booleanAttribute });

}

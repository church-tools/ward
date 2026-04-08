import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { MessageViewService } from './message-view.service';

@Component({
    selector: 'app-message-list-row',
    template: `
        <div class="row full-width {{ narrow() ? 'm-1-2' : 'm-4' }} row-gap-1 column-gap-2 items-center">
            <app-icon [icon]="messageView.icon" size="sm" class="text-secondary"/>
            <h4 class="overflow-ellipsis">{{ messageView.toString(row()) }}</h4>
            @if (row().duration; as duration) {
                <span class="small-text text-secondary">{{ duration }}</span>
            }
        </div>
    `,
    imports: [Icon],
})
export class MessageListRow extends ListRow<'message'> {

    protected readonly messageView = inject(MessageViewService);

    readonly narrow = input(false, { transform: booleanAttribute });

}

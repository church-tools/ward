import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { MessageViewService } from './message-view.service';

@Component({
    selector: 'app-message-list-row',
    template: `
        <div class="row grow-1 {{ dense() ? 'm-2-3 column-gap-1' : 'm-4 column-gap-2' }} row-gap-1 items-center">
            @if (dense()) {
                <app-icon [icon]="messageView.icon" size="xs" filled/>
                @if (row().type === 'testimony') {
                    <span class="small-text subtle-text">{{ 'MESSAGE_PAGE.TYPE.TESTIMONY' | localize }}</span>
                }
                <span class="overflow-ellipsis">{{ messageView.toString(row()) }}</span>
            } @else {
                <app-icon [icon]="messageView.icon" size="sm" filled/>
                @if (row().type === 'testimony') {
                    <h4 class="subtle-text">{{ 'MESSAGE_PAGE.TYPE.TESTIMONY' | localize }}</h4>
                }
                <h4 class="overflow-ellipsis">{{ messageView.toString(row()) }}</h4>
            }
            @if (row().duration; as duration) {
                <span class="small-text subtle-text">{{ duration }}</span>
            }
        </div>
    `,
    imports: [Icon, LocalizePipe],
})
export class MessageListRow extends ListRow<'message'> {

    protected readonly messageView = inject(MessageViewService);

    readonly dense = input(false, { transform: booleanAttribute });

}

import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { xcomputed } from '@/shared/utils/signal-utils';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { MessageViewService } from './message-view.service';

@Component({
    selector: 'app-message-list-row',
    template: `
        <div class="row grow-1 {{ dense() ? 'm-2-3 column-gap-1' : 'm-4 column-gap-2' }} row-gap-1 items-center">
            @if (isCustomText()) {
                <app-icon icon="text_bullet_list_square_edit" [size]="dense() ? 'xs' : 'sm'" filled/>
                <span class="overflow-ellipsis">
                    {{ customText() || ('SACRAMENT_MEETING_PAGE.CUSTOM_TEXT' | localize) }}
                </span>
            } @else {
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
            }
            @if (!isCustomText() && row().duration; as duration) {
                <span class="small-text subtle-text">{{ duration }}</span>
            }
        </div>
    `,
    imports: [Icon, LocalizePipe],
})
export class MessageListRow extends ListRow<'message'> {

    protected readonly messageView = inject(MessageViewService);
    protected readonly isCustomText = xcomputed([this.row], row => !row.speaker);
    protected readonly customText = xcomputed([this.row], row => row.topic?.trim() || '');

    readonly dense = input(false, { transform: booleanAttribute });

}

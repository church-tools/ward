import { ListRow } from '@/modules/shared/row-card-list/list-row';
import { Icon } from '@/shared/icon/icon';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { booleanAttribute, Component, inject, input } from '@angular/core';
import { CustomTextViewService } from './custom-text-view.service';

@Component({
    selector: 'app-custom-text-list-row',
    template: `
        <div class="row grow-1 {{ dense() ? 'm-2-3 column-gap-1' : 'm-4 column-gap-2' }} row-gap-1 items-center">
            <app-icon [icon]="customTextView.icon" [size]="dense() ? 'xs' : 'sm'" filled/>
            <span class="overflow-ellipsis">
                {{ customTextView.toString(row()) || ('SACRAMENT_MEETING_PAGE.CUSTOM_TEXT' | localize) }}
            </span>
        </div>
    `,
    imports: [Icon, LocalizePipe],
})
export class CustomTextListRow extends ListRow<'custom_text'> {

    protected readonly customTextView = inject(CustomTextViewService);

    readonly dense = input(false, { transform: booleanAttribute });

}

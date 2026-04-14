import { Component, inject } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { ListRow } from '../shared/row-card-list/list-row';
import { MemberCallingViewService } from './member-calling-view.service';

@Component({
    selector: 'app-member-calling-list-row',
    template: `
        <div class="col m-4 gap-1">
            <h4 class="overflow-ellipsis">{{ row()._calculated.memberName }}</h4>
            <span class="overflow-ellipsis">{{ 'AS' | localize }} {{ row()._calculated.calling?.name }}</span>
            <span class="{{ stateOption().color }}-text">
                {{ stateOption().view | localize }}
            </span>
        </div>
    `,
    imports: [LocalizePipe],
})
export class MemberCallingListRow extends ListRow<'member_calling'> {

    private readonly memberCallingView = inject(MemberCallingViewService);

    protected readonly stateOption = () => this.memberCallingView.stateOptionsByState[this.row().state];
}

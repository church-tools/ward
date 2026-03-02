import { Component, inject } from '@angular/core';
import { SupabaseService } from '../../shared/service/supabase.service';
import { xcomputed } from '../../shared/utils/signal-utils';
import { supaSyncedArraySignal } from '../../shared/utils/supa-sync/supa-synced-array';
import { ListRowComponent } from '../shared/row-card-list/list-row';

@Component({
    selector: 'app-calling-list-row',
    template: `
        <div class="row m-3-4">
            <span class="overflow-ellipsis">{{ row().name }}</span>
            @for (memberCalling of memberCallings()(); track memberCalling.member) {
                <span class="overflow-ellipsis">{{ memberCalling._calculated.memberName }}</span>
            }
        </div>
    `,
})
export class CallingListRowComponent extends ListRowComponent<'calling'> {

    private readonly supabase = inject(SupabaseService);

    protected readonly memberCallings = xcomputed([this.row], row => {
        const query = this.supabase.sync.from('member_calling').find().eq('calling', row.id);
        return supaSyncedArraySignal(query);
    });

}

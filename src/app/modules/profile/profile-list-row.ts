import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';
import { IconComponent } from '../../shared/icon/icon';
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-profile-list-row',
    template: `
        <div class="row m-4">
            <h4>
                @if (awaitsApproval()) {
                    <app-icon class="accent-text"
                        icon="question_circle"
                        [filled]="true"/>
                }
                {{ row().email }}
            </h4>
        </div>
    `,
    imports: [IconComponent],
})
export class ProfileListRowComponent extends ListRowComponent<'profile'> {

    protected readonly awaitsApproval = xcomputed([this.row],
        row => !row.unit_approved);
    
    protected accept = async () => {

    }

    protected reject = async () => {

    }
}
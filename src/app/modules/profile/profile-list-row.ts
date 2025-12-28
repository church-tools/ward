import { Component } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-profile-list-row',
    template: `
        <div class="row m-4 gap-2">
            @if (!row().unit_approved) {
                <app-icon class="accent-text"
                    icon="question_circle"
                    [filled]="true"/>
            }
            <h4>
                {{ row().email }}
            </h4>
            @if (row().is_admin) {
                <app-icon class="accent-text"
                    icon="shield_person"/>
            }
        </div>
    `,
    imports: [IconComponent],
})
export class ProfileListRowComponent extends ListRowComponent<'profile'> {
    
}
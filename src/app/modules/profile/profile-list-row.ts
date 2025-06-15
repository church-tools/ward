import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-profile-list-row',
    template: `
        <div class="column m-3">
            <h3>{{ row().id || "Title" }}</h3>
        </div>
    `,
})
export class ProfileListRowComponent extends ListRowComponent<'profile'> {
    
}
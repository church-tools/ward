import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';

@Component({
    selector: 'app-agenda-list-row',
    template: `
        <div class="column m-3">
            <h3>{{ row().name || "Title" }}</h3>
        </div>
    `,
})
export class AgendaListRowComponent extends ListRowComponent<'agenda'> {
    

}
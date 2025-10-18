import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';
import { Icon, IconComponent } from "../../shared/icon/icon";
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-agenda-list-row',
    template: `
        <div class="row m-6-8">
            <h3>
                @if (row().shape) {
                    <app-icon [icon]="icon()" [filled]="true"
                        class="{{row().color}}-active"></app-icon>
                }
                {{ row().name }}
            </h3>
        </div>
    `,
    imports: [IconComponent],
})
export class AgendaListRowComponent extends ListRowComponent<'agenda'> {
    
    protected readonly icon = xcomputed([this.row], row => row?.shape as Icon);
}
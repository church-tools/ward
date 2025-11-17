import { Component } from '@angular/core';
import { ListRowComponent } from '../shared/list-row';
import { Icon, IconComponent } from "../../shared/icon/icon";
import { xcomputed } from '../../shared/utils/signal-utils';
import { MeetingsPageComponent } from '../../private/meetings/meetings-page';

@Component({
    selector: 'app-agenda-list-row',
    template: `
        <div class="row no-wrap full-width items-center m-6-8">
            <h3 class="grow-1">
                @if (row().shape) {
                    <app-icon [icon]="icon()" [filled]="true"
                        class="{{row().color}}-active"/>
                }
                <span class="overflow-ellipsis">{{ row().name }}</span>
            </h3>
            @if (showChevron()) {    
                <app-icon class="ms-auto" icon="chevron_right"/>
            }
        </div>
    `,
    imports: [IconComponent],
    host: {
        class: 'full-width row items-center',
    }
})
export class AgendaListRowComponent extends ListRowComponent<'agenda'> {
    
    protected readonly icon = xcomputed([this.row], row => row?.shape as Icon);

    protected readonly showChevron = xcomputed([this.page],
        page => page instanceof MeetingsPageComponent);
}
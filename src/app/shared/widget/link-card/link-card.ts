import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Icon, IconCode } from '../../icon/icon';
import { HoverNudgeDirective } from '../../utils/hover-nudge.directive';

@Component({
    selector: 'app-link-card',
    template: `
        <a class="stealth card canvas-card selectable-card" [routerLink]="href()" appHoverNudge>
            <div class="row no-wrap items-center m-6-8">
                <h3 class="grow-1">
                    <app-icon [icon]="icon()" filled/>
                    <span class="overflow-ellipsis">{{ label() }}</span>
                </h3>
                <app-icon class="ms-auto" icon="chevron_right"/>
            </div>
        </a>
    `,
    styleUrl: './link-card.scss',
    imports: [RouterModule, Icon, HoverNudgeDirective],
})
export default class LinkCard {

    readonly href = input.required<string>();
    readonly icon = input.required<IconCode>();
    readonly label = input.required<string>();
}

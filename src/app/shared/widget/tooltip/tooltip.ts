import { Component, input, signal } from '@angular/core';
import { Icon, IconComponent, IconSize } from '../../icon/icon';
import { ColorName } from '../../utils/color-utils';
import { wait } from '../../utils/flow-control-utils';

@Component({
    selector: 'app-tooltip',
    imports: [IconComponent],
    template: `
        <app-icon [size]="size()" [icon]="icon()" [class]="color()"
            (mouseenter)="onMouseEnter()"
            (mouseleave)="onMouseLeave()"/>
        @if (shouldShow() > 0) {
            <div class="tooltip card acrylic-card" animate.leave="leave"
                (mouseenter)="onMouseEnter()"
                (mouseleave)="onMouseLeave()">
                <ng-content/>
            </div>
        }`,
    styleUrl: './tooltip.scss'
})
export class TooltipComponent {

    protected readonly icon = input<Icon>('info');
    protected readonly color = input<ColorName>('accent');
    protected readonly size = input<IconSize>('xs');

    protected readonly shouldShow = signal(0);

    protected onMouseEnter() {
        this.shouldShow.update(count => count + 1);
    }

    protected async onMouseLeave() {
        await wait(500);
        this.shouldShow.update(count => count - 1);
    }
}

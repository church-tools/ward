import { Component, input } from '@angular/core';
import { Icon, IconComponent } from '../../icon/icon';
import { ColorName } from '../../utils/color-utils';
import { TooltipPopupComponent } from './tooltip-popup';

@Component({
    selector: 'app-tooltip',
    imports: [IconComponent, TooltipPopupComponent],
    template: `
        <app-icon [size]="size()" [icon]="icon()" [class]="color()"/>
        <app-tooltip-popup><ng-content/></app-tooltip-popup>`,
    styles: [`
        :host {
            position: relative;
            display: inline-block;
            align-self: center;
        }
        app-icon {
            font-size: 14px !important;
            min-width: 14px !important;
            min-height: 14px !important;
        }
    `]
})
export class TooltipComponent {

    protected readonly icon = input<Icon>('info');
    protected readonly color = input<ColorName>('accent');
    protected readonly size = input<'xs' | 'sm' | 'smaller' | 'md' | 'lg' | 'xl'>('xs');
}

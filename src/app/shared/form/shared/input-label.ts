import { Component, model, signal } from '@angular/core';
import { TooltipComponent } from '../../widget/tooltip/tooltip';
import { Icon, IconComponent } from '../../icon/icon';

@Component({
    selector: 'app-input-label',
    imports: [IconComponent, TooltipComponent],
    template: `
        @if (label()) {
            @if (icon()) { <app-icon [icon]="icon()!" [filled]="true" size="sm"/> }
            <span class="label color-text">{{label()}}</span>
            @if (required()) { <span class="required-indicator">*</span>}
        }
        @if (info()) { <app-tooltip>{{info()}}</app-tooltip> }
    `,
    styles: [`
        :host {
            display: flex;
            max-width: 100%;
            gap: 0.25rem;
        }
        app-icon {
            margin-right: 0.0625rem;
        }
    `]
})
export default class InputLabelComponent {

    readonly icon = model<Icon | undefined>();
    readonly label = model<string | undefined>();
    readonly required = model(false);
    readonly info = signal<string | undefined>(undefined);
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ColorName } from '../../utils/color-utils';
import ErrorMessageComponent from '../../widget/error-message/error-message';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from '../shared/input-label';

@Component({
    selector: 'app-checkbox',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InputLabelComponent, ErrorMessageComponent],
    template: `
        <div class="column">
            <label class="row reverse no-wrap items-center"
                [class.reverse]="labelSide() === 'right'">
                <app-input-label class="full-width"/>
                <ng-content/>
                <div class="checkbox {{color()}}-text" [class.checked]="viewValue()">
                    <input title="{{label()}}" type="checkbox"
                        [checked]="viewValue()" (click)="onClick($event)"
                        [disabled]="disabled()">
                    <svg fill=currentcolor width=12 height=12>
                        <path d="M9.76 3.2c.3.29.32.76.04 1.06l-4.25 4.5a.75.75 0 0 1-1.08.02L2.22 6.53a.75.75 0 0 1 1.06-1.06l1.7 1.7L8.7 3.24a.75.75 0 0 1 1.06-.04Z" fill="currentColor"></path>
                    </svg>
                </div>
            </label>
            <app-error-message/>
        </div>`,
    styleUrl: './checkbox.scss',
    providers: getProviders(() => CheckboxComponent)
})
export default class CheckboxComponent extends InputBaseComponent<boolean> {

    readonly color = input<ColorName>('accent');
    readonly labelSide = input<'left' | 'right'>('right');

    protected onClick(event: MouseEvent): void {
        if (!this.isRealClick()) return;
        this.setViewValue(!(this.viewValue() ?? false));
        event.stopPropagation();
    }
}

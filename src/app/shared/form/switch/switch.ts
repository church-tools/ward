import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorName } from '../../utils/color-utils';
import ErrorMessageComponent from '../../widget/error-message/error-message';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from '../shared/input-label';

@Component({
    selector: 'app-switch',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, InputLabelComponent, ErrorMessageComponent],
    template: `
        <div class="column">
            <label class="row items-center"
                [class.no-wrap]="forceLabelOnSide()"
                [class.reverse]="forceLabelOnTop()"
                [class.min-content-width]="forceLabelOnTop()">
                <app-input-label/>
                <div class="switch {{color()}}-fg" [class.checked]="value()">
                    <input title="{{label()}}" type="checkbox" [(ngModel)]="value" (click)="onClick($event)" [disabled]="disabledState()">
                    <svg fill="currentcolor" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" fill="currentColor"></path>
                    </svg>
                </div>
            </label>
            <app-error-message/>
        </div>`,
    styleUrl: './switch.scss',
    providers: getProviders(() => SwitchComponent)
})
export default class SwitchComponent extends InputBaseComponent<boolean> {

    readonly color = input<ColorName>('accent');
    readonly forceLabelOnTop = input(false);
    readonly forceLabelOnSide = input(false);
    readonly labelSide = input<'left' | 'right'>('right');

    protected onClick(event: MouseEvent): void {
        if (!this.isRealClick()) return;
        this.value.set(!this.value());
        this.emitChange();
        event.stopPropagation();
    }
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColorName } from '../../utils/color-utitls';
import ErrorMessageComponent from '../../widget/error-message/error-message';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from '../shared/input-label';

@Component({
    selector: 'app-switch',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, InputLabelComponent, ErrorMessageComponent],
    templateUrl: './switch.html',
    styleUrl: './switch.scss',
    providers: getProviders(() => SwitchComponent)
})
export default class SwitchComponent extends InputBaseComponent<boolean> {

    protected readonly color = input<ColorName>('accent');
    protected readonly forceLabelOnTop = input(false);
    protected readonly forceLabelOnSide = input(false);

    protected onClick(event: MouseEvent): void {
        event.stopPropagation();
    }
}

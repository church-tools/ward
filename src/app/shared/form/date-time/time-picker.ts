import { ChangeDetectionStrategy, Component } from '@angular/core';
import ErrorMessageComponent from '../../widget/error-message/error-message';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from '../shared/input-label';
import { PromiseOrValue } from '../../types';

@Component({
    selector: 'app-time-picker',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InputLabelComponent, ErrorMessageComponent],
    providers: getProviders(() => TimePickerComponent),
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <input type="time"
                    [value]="viewValue() ?? ''"
                    [required]="required()"
                    [disabled]="disabled()"
                    [placeholder]="placeholder()"
                    (input)="onInput($event)">
            </div>
            <app-error-message/>
        </label>
    `,
})
export default class TimePickerComponent extends InputBaseComponent<string, number> {

    override readonly debounceTime = 300;

    protected onInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.setViewValue(target.value ?? '');
    }

    protected override mapIn(value: number | null): PromiseOrValue<string | null> {
        if (value == null) return null;
        const timeString = value.toString().padStart(4, '0');
        const hours = parseInt(timeString.slice(0, 2), 10);
        const minutes = parseInt(timeString.slice(2), 10);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    protected override mapOut(value: string | null): PromiseOrValue<number | null> {
        if (value == null) return null;  
        const [hours, minutes] = value.split(':').map(Number);
        return hours * 100 + minutes;
    }
}

import { Component, forwardRef, ForwardRefFn, input, model } from "@angular/core";
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from "@angular/forms";
import { Icon } from "../../icon/icon";

export function getProviders(forwardRefFn: ForwardRefFn) {
    return [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(forwardRefFn), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(forwardRefFn), multi: true },
    ]
}


@Component({
    template: '',
    host: {
        'class': 'input',
        '[class.disabled]': 'isDisabled()',
        '(focusout)': 'onTouched()'
    },
})
export class InputBaseComponent<T> implements ControlValueAccessor, Validator {

    readonly label = model<string>('');
    readonly labelIcon = input<Icon | null>(null);
    readonly placeholder = input<string>('');

    protected readonly value = model<T | null>(null);
    isDisabled = false;

    onChange = (value: any) => {};
    onTouched = () => {};

    writeValue(value: any): void {
        this.value.set(value);
    }

    registerOnChange(fn: (value: any) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return null;
    }

    protected onFocusOut(event: FocusEvent): void {
        
    }
}
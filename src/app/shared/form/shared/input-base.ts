import { Component, forwardRef, ForwardRefFn, input, model, output, signal } from "@angular/core";
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
        '[class.disabled]': 'disabledState()',
        '(focusout)': 'onTouched(); onBlur.emit()',
    },
})
export class InputBaseComponent<T> implements ControlValueAccessor, Validator {

    readonly label = model<string>('');
    readonly labelIcon = input<Icon | null>(null);
    readonly placeholder = input<string>('');
    readonly onBlur = output<void>();

    protected readonly value = signal<T | null>(null);
    protected readonly disabledState = signal<boolean>(false);


    private justClickedSomething = false;

    private onChange = (value: any) => {};
    private onTouched = () => {};

    writeValue(value: any): void {
        this.value.set(value);
    }

    getValue(): T | null {
        return this.value();
    }

    registerOnChange(fn: (value: any) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabledState.set(isDisabled);
    }

    validate(control: AbstractControl): ValidationErrors | null {
        return null;
    }

    protected async emitChange() {
        this.onTouched?.();
        if (!this.onChange) return;
        const mapped = await this.mapOut(this.value());
        this.onChange?.(mapped);
    }

    protected async mapOut(value: T | null) {
        return value;
    }

    protected onFocusOut(event: FocusEvent): void {
        
    }
    
    protected isRealClick() {
        if (this.justClickedSomething)
            return false;
        this.justClickedSomething = true;
        setTimeout(() => this.justClickedSomething = false, 200);
        return true;
    }
}
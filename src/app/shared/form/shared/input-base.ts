import { Component, forwardRef, ForwardRefFn, input, model, output, signal, viewChild } from "@angular/core";
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from "@angular/forms";
import { Icon } from "../../icon/icon";
import { PromiseOrValue } from "../../types";
import { xeffect } from "../../utils/signal-utils";
import ErrorMessageComponent from "../../widget/error-message/error-message";
import InputLabelComponent from "./input-label";

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
        '[class.subtle]': 'subtle()',
        '(focusout)': 'onTouched(); onBlur.emit()',
    },
})
export class InputBaseComponent<TIn, TOut = TIn> implements ControlValueAccessor, Validator {

    private readonly labelView = viewChild(InputLabelComponent);
    protected readonly errorView = viewChild(ErrorMessageComponent);

    readonly label = model<string | undefined>();
    readonly labelIcon = input<Icon | undefined>();
    readonly info = input<string | undefined>();
    readonly placeholder = input<string>('');
    readonly required = input<boolean>(false);
    readonly indicateRequired = input<boolean>(true);
    readonly subtle = input<boolean>(false);
    readonly onBlur = output<void>();

    protected readonly value = signal<TIn | null>(null);
    protected readonly disabledState = signal<boolean>(false);


    private justClickedSomething = false;

    private onChange = (value: any) => {};
    private onTouched = () => {};

    constructor() {
        xeffect([this.labelView, this.label], (labelView, label) => labelView?.label.set(label!));
        xeffect([this.labelView, this.labelIcon], (labelView, icon) => labelView?.icon.set(icon));
        xeffect([this.labelView, this.info], (labelView, info) => labelView?.info.set(info));
        xeffect([this.labelView, this.required, this.indicateRequired, this.disabledState],
            (labelView, required, indicateRequired, disabledState) => labelView?.required.set(!!required && !!indicateRequired && !disabledState));
    }

    async writeValue(value: any) {
        const mapped = await this.mapIn(value)
        this.value.set(mapped);
    }

    getValue(): TIn | null {
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

    protected mapIn(value: TOut): PromiseOrValue<TIn> {
        return value as any as TIn;
    }

    protected mapOut(value: TIn | null): PromiseOrValue<TOut> {
        return value as any as TOut;
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
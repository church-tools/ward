import { Component, ForwardRefFn, booleanAttribute, forwardRef, input, model, output, signal, viewChild } from "@angular/core";
import { ValidationError } from "@angular/forms/signals";
import { Icon } from "../../icon/icon";
import { PromiseOrValue } from "../../types";
import { xeffect } from "../../utils/signal-utils";
import { HasFormValueControl } from "../../utils/supa-sync/synced-field.directive";
import ErrorMessageComponent from "../../widget/error-message/error-message";
import InputLabelComponent from "./input-label";

export function getProviders(forwardRefFn: ForwardRefFn) {
    return [
        { provide: InputBaseComponent, useExisting: forwardRef(forwardRefFn) },
        { provide: HasFormValueControl, useExisting: forwardRef(forwardRefFn) },
    ]
}

@Component({
    template: '',
    host: {
        'class': 'input',
        '[class.disabled]': 'disabled()',
        '[class.subtle]': 'subtle()',
        '(focusout)': 'markTouched(); onBlur.emit()',
    },
})
export class InputBaseComponent<TIn, TOut = TIn> extends HasFormValueControl<TOut | null> {

    private readonly labelView = viewChild(InputLabelComponent);
    protected readonly errorView = viewChild(ErrorMessageComponent);

    readonly label = model<string | undefined>();
    readonly labelIcon = input<Icon | undefined>();
    readonly info = input<string | undefined>();
    readonly placeholder = input<string>('');
    readonly required = input<boolean>(false);
    readonly hideRequiredIndicator = input<boolean, unknown>(true, { transform: booleanAttribute });
    readonly subtle = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly onBlur = output<void>();

    protected readonly viewValue = signal<TIn | null>(null);
    readonly value = model<TOut | null>(null);
    readonly disabled = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly touched = model(false);
    readonly dirty = input(false);
    readonly errors = model<ValidationError[]>([]);
    
    readonly debounceTime: number | undefined;

    private justClickedSomething = false;
    private currentMapToken: symbol | null = null;

    constructor() {
        super();
        xeffect([this.labelView, this.label], (labelView, label) => labelView?.label.set(label));
        xeffect([this.labelView, this.labelIcon], (labelView, icon) => labelView?.icon.set(icon));
        xeffect([this.labelView, this.info], (labelView, info) => labelView?.info.set(info));
        xeffect([this.labelView, this.required, this.hideRequiredIndicator, this.disabled],
            (labelView, required, hideRequiredIndicator, disabledState) => labelView?.required.set(required && !hideRequiredIndicator && !disabledState));
        xeffect([this.value], (modelValue) => {
            this.updateViewFromModel(modelValue);
        });
        xeffect([this.errorView, this.errors, this.touched, this.disabled], (errorView, errors, touched, disabled) => {
            if (!errorView || disabled) return;
            errorView.setError(touched ? (errors[0]?.message ?? null) : null);
        });
    }

    getValue(): TIn | null {
        return this.viewValue();
    }

    protected markTouched() {
        this.touched.set(true);
    }

    protected setViewValue(value: TIn | null, emit = true) {
        this.viewValue.set(value);
        if (emit)
            this.emitChange(value);
    }

    protected async emitChange(viewValue: TIn | null = this.viewValue()) {
        const mapped = await this.mapOut(viewValue);
        this.value.set(mapped);
    }

    protected mapIn(value: TOut | null): PromiseOrValue<TIn | null> {
        return value as any as TIn;
    }

    protected mapOut(value: TIn | null): PromiseOrValue<TOut | null> {
        return value as any as TOut;
    }

    protected onFocusOut(event: FocusEvent): void {
        
    }
    
    private async updateViewFromModel(value: TOut | null) {
        const token = Symbol("mapIn");
        this.currentMapToken = token;
        const mapped = await this.mapIn(value);
        if (this.currentMapToken !== token)
            return;
        this.viewValue.set(mapped);
    }

    private pushModelValue(value: TOut | null) {
    }

    protected isRealClick() {
        if (this.justClickedSomething)
            return false;
        this.justClickedSomething = true;
        setTimeout(() => this.justClickedSomething = false, 200);
        return true;
    }
}
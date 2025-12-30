import { Component, ElementRef, inject, input, OnDestroy, signal, viewChild } from '@angular/core';
import { WindowService } from '../../service/window.service';
import { transitionStyle } from '../../utils/dom-utils';
import { wait } from '../../utils/flow-control-utils';
import { animationDurationMs, easeOut } from '../../utils/style';
import ErrorMessageComponent from '../../widget/error-message/error-message';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";

@Component({
    selector: 'app-textarea',
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <textarea #textarea [required]="required()"
                    [class]="textClass()"
                    [value]="viewValue() ?? ''" (input)="onInput($event)"
                    [disabled]="disabled()"
                    [placeholder]="placeholder()"
                    (click)="onClick($event)"
                    (blur)="onBlurred()"
                    (keypress)="onKeyPress($event)"></textarea>
                <div #shadow class="textarea" [class]="textClass()"></div>
            </div>
            <app-error-message/>
        </label>
    `,
    styles: [`
        .form-input {
            position: relative;
            textarea {
                resize: none;
                overflow: hidden !important;
            }
            .textarea {
                visibility: hidden;
                position: absolute;
            }
            textarea, .textarea {
                width: 100%;
                box-sizing: border-box;
            }

        }
    `],
    providers: getProviders(() => TextareaComponent),
    imports: [InputLabelComponent, ErrorMessageComponent]
})
export class TextareaComponent extends InputBaseComponent<string> implements OnDestroy {
    
    private readonly windowService = inject(WindowService);

    readonly characterLimit = input<number>(0);
    readonly trim = input<boolean>(false);
    readonly textClass = input<string | undefined>();

    protected readonly copied = signal(false);

    private readonly textareaView = viewChild.required('textarea', { read: ElementRef });
    private readonly shadowView = viewChild.required('shadow', { read: ElementRef });
    override readonly debounceTime = 300;
    private readonly resizeSubscription = this.windowService.onResize.subscribe(() => this.resizeToFit());

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
        this.resizeToFit();
    }

    protected onBlurred() {
        wait(100).then(() => this.resizeToFit());
    }

    protected onInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.setViewValue(target.value ?? '');
    }

    protected onKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter')
            this.textareaView().nativeElement.blur();
        if (this.characterLimit() && (this.viewValue()?.length ?? 0) >= this.characterLimit()) {
            event.preventDefault();
        }
    }

    protected override mapIn(value: string | null): string {
        wait(10).then(() => this.resizeToFit(true));
        return value ?? '';
    }

    protected override mapOut(value: string): string {
        this.resizeToFit();
        return this.trim() ? value.trim() : value;
    }

    protected resizeToFit(instant = false) {
        const elem = this.textareaView().nativeElement as HTMLTextAreaElement;
        const shadow = this.shadowView().nativeElement as HTMLDivElement;
        const from = elem.style.height;
        shadow.textContent = elem.value + "\u200b"; // zero-width space
        // elem.style.height = shadow.offsetHeight + 'px';
        if (from === shadow.offsetHeight + 'px') return;
        if (instant)
            elem.style.height = shadow.offsetHeight + 'px';
        else
            transitionStyle(elem,
                { height: from },
                { height: shadow.offsetHeight + 'px' },
                animationDurationMs, easeOut);
    }
}
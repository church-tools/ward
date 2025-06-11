import { Component, input, signal, viewChild } from "@angular/core";
import { IconComponent } from "../../../icon/icon";
import { multiComputed, multiEffect } from "../../../utils/signal-utils";
import ErrorMessageComponent from "../../../widget/error-message/error-message";
import ButtonBaseComponent from "../shared/button-base";

export type ProgressCallback = (progress: number) => void;

@Component({
    selector: 'app-async-button',
    imports: [IconComponent, ErrorMessageComponent],
    template: `
        <button #button (click)="press($event)" [disabled]="disabled() || connectionLost()"
            [title]="windowService.isOnline() ? title() : 'Server kann nicht erreicht werden'"
            title="{{title()}}" type="button"
            [class]="classes()">
            @if (progressIcon()) {
                <app-icon [icon]="progressIcon()!" [filled]="iconFilled()" [size]="iconSize()"
                    [class.bounce]="success() !== null"
                    [class.wiggle]="connectionLost()"/>
            }
            <ng-content/>
            @if (progress()) {
                <div class="progress-bar" [class.done]="success() != null" [style.width]="100 * progress() + '%'"></div>
            }
        </button>
        <app-error-message/>
    `,
    styleUrl: './async-button.scss'
})
export default class AsyncButtonComponent extends ButtonBaseComponent {
    
    protected readonly errorMessage = viewChild.required(ErrorMessageComponent);

    readonly onClick = input.required<(event?: UIEvent, progressCallback?: ProgressCallback) => Promise<any>>();
    readonly needsInternet = input(false);
    readonly showSuccess = input(true);

    protected readonly success = signal<boolean | null>(null);
    protected readonly progress = signal<number>(0);
    private readonly inProgress = signal(false);
    protected readonly connectionLost = signal<boolean | null>(null);
    protected readonly progressIcon = multiComputed([this.icon, this.inProgress, this.connectionLost, this.success, this.showSuccess],
        (icon, inProgress, connectionLost, success, showSuccess) => {
            if (connectionLost) return 'plug_disconnected';
            if (inProgress) return 'throbber';
            if (showSuccess && success !== null) return success ? 'checkmark' : 'dismiss';
            return icon;
        });
    
    constructor() {
        super();
        multiEffect([this.needsInternet, this.windowService.isOnline], (needsInternet, isOnline) => {
            if (needsInternet) this.connectionLost.set(!isOnline);
        });
    }

    press(event?: UIEvent) {
        if (this.errorMessage().getError())
            this.errorMessage().setError(null);
        event?.preventDefault();
        event?.stopPropagation();
        if (this.inProgress()) return;
        this.success.set(null);
        this.inProgress.set(true);
        this.progress.set(0);
        this.onClick()(event, progress => this.progress.set(progress))
        .then(() => {
            this.inProgress.set(false);
            this.success.set(true);
            setTimeout(() => this.progress.set(0), 300);
            setTimeout(() => this.success.set(null), 3000);
        })
        .catch(err => {
            this.errorMessage().setError("Fehlgeschlagen");
            console.error(err);
            this.inProgress.set(false);
            this.success.set(false);
            setTimeout(() => this.progress.set(0), 300);
            setTimeout(() => this.success.set(null), 3000);
        });
    }

    execute() {
        this.press();
    }
}
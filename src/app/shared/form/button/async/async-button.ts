import { Icon } from "@/shared/icon/icon";
import { xcomputed, xeffect } from "@/shared/utils/signal-utils";
import ErrorMessage from "@/shared/widget/error-message/error-message";
import { booleanAttribute, Component, input, signal, viewChild } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import ButtonBase from "../shared/button-base";

export type ProgressCallback = (progress: number) => void;

@Component({
    selector: 'app-async-button',
    imports: [TranslateModule, Icon, ErrorMessage],
    template: `
        <button #button (click)="press($event)" [disabled]="disabled() || connectionLost()"
            [title]="windowService.isOnline() ? title() : ('ERROR.SERVER_UNAVAILABLE' | translate)"
            title="{{title()}}" type="button"
            class="button {{classes()}}">
            @let icon = progressIcon();
            @if (icon) {
                <app-icon [icon]="icon" [filled]="iconFilled()" [size]="iconSize()"
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
export class AsyncButton extends ButtonBase {
    
    protected readonly errorMessage = viewChild.required(ErrorMessage);

    readonly onClick = input.required<(event?: UIEvent, progressCallback?: ProgressCallback) => Promise<any>>();
    readonly needsInternet = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly hideSuccess = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected readonly success = signal<boolean | null>(null);
    protected readonly progress = signal<number>(0);
    private readonly _inProgress = signal(false);
    public readonly inProgress = this._inProgress.asReadonly();
    protected readonly connectionLost = signal<boolean | null>(null);
    protected readonly progressIcon = xcomputed([this.icon, this._inProgress, this.connectionLost, this.success, this.hideSuccess],
        (icon, inProgress, connectionLost, success, hideSuccess) => {
            if (connectionLost) return 'plug_disconnected';
            if (inProgress) return 'throbber';
            if (!hideSuccess && success !== null) return success ? 'checkmark' : 'dismiss';
            return icon;
        });
    
    constructor() {
        super();
        xeffect([this.needsInternet, this.windowService.isOnline], (needsInternet, isOnline) => {
            if (needsInternet) this.connectionLost.set(!isOnline);
        });
    }

    press(event?: UIEvent) {
        event?.preventDefault();
        event?.stopPropagation();
        if (!this.isRealClick()) return;
        if (this.errorMessage().getError())
            this.errorMessage().setError(null);
        if (this._inProgress()) return;
        this.success.set(null);
        this._inProgress.set(true);
        this.progress.set(0);
        this.onClick()(event, progress => this.progress.set(progress))
        .then(() => {
            this._inProgress.set(false);
            this.success.set(true);
            setTimeout(() => this.progress.set(0), 300);
            setTimeout(() => this.success.set(null), 3000);
        })
        .catch(err => {
            this.errorMessage().setError(typeof err === 'string' ? err : "ERROR.FAILED");
            console.error(err);
            this._inProgress.set(false);
            this.success.set(false);
            setTimeout(() => this.progress.set(0), 300);
            setTimeout(() => this.success.set(null), 3000);
        });
    }

    execute() {
        this.press();
    }

    setError(message: string) {
        this.errorMessage().setError(message);
    }
}
import { Component, signal } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import ButtonComponent from "../../form/button/button";
import { PopoverPage } from "./popover";

@Component({
    selector: 'app-confirm-popover',
    template: `
        <div class="m-4-6 column gap-4 max-width-96">
            <h2>{{ title() | translate }}</h2>
            <p>{{ message() | translate }}</p>
            <div class="row center-content gap-2">
                <app-button type="primary" size="large" (onClick)="callback(true)">{{ confirmText() | translate }}</app-button>
                <app-button type="secondary" size="large" (onClick)="callback(false)">{{ cancelText() | translate }}</app-button>
            </div>
        <div>
    `,
    imports: [TranslateModule, ButtonComponent],
    styleUrl: './popover.scss',
})
export class ConfirmPopoverComponent extends PopoverPage {

    readonly title = signal('');
    readonly message = signal('');
    readonly confirmText = signal('');
    readonly cancelText = signal('');

    callback!: (confirmed: boolean) => void;
}

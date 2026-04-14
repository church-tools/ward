import { LocalizePipe } from '@/shared/language/localize.pipe';
import { Page } from "@/shared/page/page";
import { Component, signal } from "@angular/core";
import { Button } from "../../form/button/button";

@Component({
    selector: 'app-confirm-popover',
    template: `
        <div class="m-4-6 column gap-4 max-width-96">
            <h2>{{ title() | localize }}</h2>
            <p>{{ message() | localize }}</p>
            <div class="row center-content gap-2">
                <app-button type="primary" size="large" (onClick)="callback(true)">{{ confirmText() | localize }}</app-button>
                <app-button type="secondary" size="large" (onClick)="callback(false)">{{ cancelText() | localize }}</app-button>
            </div>
        <div>
    `,
    imports: [LocalizePipe, Button],
    styleUrl: './popover.scss',
})
export class ConfirmPopover extends Page {

    readonly title = signal('');
    readonly message = signal('');
    readonly confirmText = signal('');
    readonly cancelText = signal('');

    callback!: (confirmed: boolean) => void;
}

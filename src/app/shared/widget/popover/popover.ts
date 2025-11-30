import { Component, model, output, viewChild } from "@angular/core";
import { xeffect } from "../../utils/signal-utils";
import ButtonComponent from "../../form/button/button";

@Component({
    selector: 'app-popover',
    template: `
        <dialog #dialog animate.leave="popover-disappear">
            <app-button type="subtle" icon="dismiss"
                class="close-button icon-only"
                shortcut="Escape" [shortcutNeedsCtrl]="false"
                (onClick)="close()"/>
            <ng-content/>
        </dialog>
    `,
    imports: [ButtonComponent],
    styleUrl: './popover.scss',
})
export class PopoverComponent {

    readonly show = model<boolean>(false);
    readonly onClose = output<void>();

    private readonly dialog = viewChild.required<{ nativeElement: HTMLDialogElement }>('dialog');

    constructor() {
        xeffect([this.show, this.dialog], (show, dialogElement) => {
            const dialog = dialogElement.nativeElement;
            if (show === dialog.open) return;
            if (show) dialog.showModal();
            else dialog.close();
        });
    }
    
    protected close() {
        this.show.set(false);
        this.onClose.emit();
    }
}
import { Component, ComponentRef, createComponent, EnvironmentInjector, output, signal, Type, viewChild, ViewContainerRef } from "@angular/core";
import ButtonComponent from "../../form/button/button";
import { animationDurationMs } from "../../utils/style";
import { wait } from "../../utils/flow-control-utils";

export class PopoverPage {
    closePopup!: () => Promise<void>;
}

@Component({
    selector: 'app-popover',
    template: `
        <dialog #dialog class="card large acrylic-card no-shadow"
            [class.disappearing]="disappearing()"
            (cancel)="$event.preventDefault(); onClose.emit()">
            <app-button type="subtle" icon="dismiss" size="large"
                class="close-button icon-only"
                shortcut="Escape" [shortcutNeedsCtrl]="false"
                (onClick)="onClose.emit()"/>
            <ng-container #contentContainer/>
        </dialog>
    `,
    imports: [ButtonComponent],
    styleUrl: './popover.scss',
})
export class PopoverComponent {

    readonly onClose = output<void>();

    private readonly dialog = viewChild.required<{ nativeElement: HTMLDialogElement }>('dialog');
    private readonly contentContainer = viewChild.required('contentContainer', { read: ViewContainerRef });

    protected readonly disappearing = signal(false);

    loadComponent<T extends PopoverPage>(component: Type<T>, injector: EnvironmentInjector): ComponentRef<T> {
        const container = this.contentContainer();
        container.clear();
        const componentRef = createComponent(component, {
            environmentInjector: injector,
            elementInjector: container.injector,
        });
        container.insert(componentRef.hostView);
        componentRef.instance.closePopup = this.close.bind(this);
        this.dialog().nativeElement.showModal();
        return componentRef;
    }

    async close() {
        this.disappearing.set(true);
        await wait(animationDurationMs);
        this.dialog().nativeElement.close();
        this.contentContainer().clear();
    }
}
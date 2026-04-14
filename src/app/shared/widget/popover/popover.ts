import { Page } from "@/shared/page/page";
import { Component, ComponentRef, createComponent, EnvironmentInjector, output, signal, Type, viewChild, ViewContainerRef } from "@angular/core";
import { Button } from "../../form/button/button";
import { wait } from "../../utils/flow-control-utils";
import { animationDurationMs } from "../../utils/style";

function isPage(value: object): value is Page {
    return value instanceof Page;
}

@Component({
    selector: 'app-popover',
    template: `
        <dialog #dialog class="card large acrylic-card no-shadow"
            [class.disappearing]="disappearing()"
            (cancel)="$event.preventDefault(); onClose.emit()">
            <app-button type="subtle" icon="dismiss" size="large"
                class="close-button icon-only"
                shortcut="Escape" shortcutWithoutCtrl
                (onClick)="onClose.emit()"/>
            <ng-container #contentContainer/>
        </dialog>
    `,
    imports: [Button],
    styleUrl: './popover.scss',
})
export class Popover {

    readonly onClose = output<void>();

    private readonly dialog = viewChild.required<{ nativeElement: HTMLDialogElement }>('dialog');
    private readonly contentContainer = viewChild.required('contentContainer', { read: ViewContainerRef });

    protected readonly disappearing = signal(false);

    loadComponent<T>(component: Type<T>, injector: EnvironmentInjector): ComponentRef<T> {
        const container = this.contentContainer();
        container.clear();
        const componentRef = createComponent(component, {
            environmentInjector: injector,
            elementInjector: container.injector,
        });
        container.insert(componentRef.hostView);
        const instance = componentRef.instance as object;
        if (isPage(instance))
            instance.closePopup = this.close.bind(this);
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
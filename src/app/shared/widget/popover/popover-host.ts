import { Component, ComponentRef, createComponent, EnvironmentInjector, output, Type, viewChild, ViewContainerRef } from "@angular/core";
import ButtonComponent from "../../form/button/button";

@Component({
    selector: 'app-popover-host',
    template: `
        <dialog #dialog animate.leave="popover-disappear" class="card acrylic-card">
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
export class PopoverHostComponent {

    readonly onClose = output<void>();

    private readonly dialog = viewChild.required<{ nativeElement: HTMLDialogElement }>('dialog');
    private readonly contentContainer = viewChild.required('contentContainer', { read: ViewContainerRef });

    loadComponent<T>(component: Type<T>, injector: EnvironmentInjector): ComponentRef<T> {
        const container = this.contentContainer();
        container.clear();
        const componentRef = createComponent(component, {
            environmentInjector: injector,
            elementInjector: container.injector,
        });
        container.insert(componentRef.hostView);
        this.dialog().nativeElement.showModal();
        return componentRef;
    }

    clear() {
        this.dialog().nativeElement.close();
        this.contentContainer().clear();
    }
    
    protected close() {
        this.dialog().nativeElement.close();
    }
}

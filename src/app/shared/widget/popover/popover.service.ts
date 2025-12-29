import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, signal, Type } from "@angular/core";
import { PopoverComponent, PopoverPage } from "./popover";
import { xcomputed } from "../../utils/signal-utils";
import { ConfirmPopoverComponent } from "./confirm-popover";

@Injectable({
    providedIn: 'root',
})
export class PopoverService {

    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(EnvironmentInjector);

    private readonly hostRef = signal<ComponentRef<PopoverComponent> | null>(null);
    readonly isOpen = xcomputed([this.hostRef], hostRef => hostRef !== null);

    async open<T extends PopoverPage>(component: Type<T>, onClose?: () => void): Promise<ComponentRef<T>> {
        await this.close();
        const hostRef = createComponent(PopoverComponent, { environmentInjector: this.injector });
        document.body.appendChild(hostRef.location.nativeElement);
        this.appRef.attachView(hostRef.hostView);
        hostRef.instance.onClose.subscribe(() => {
            this.close();
            onClose?.();
        });
        const contentRef = hostRef.instance.loadComponent(component, this.injector);
        this.hostRef.set(hostRef);
        return contentRef;
    }

    async close() {
        const hostRef = this.hostRef();
        if (!hostRef) return;
        await hostRef.instance.close();
        this.appRef.detachView(hostRef.hostView);
        hostRef.destroy();
        this.hostRef.set(null);
    }

    async confirm(title: string, message: string, confirm: string, cancelText: string): Promise<boolean> {
        return new Promise<boolean>(async resolve => {
            const confirmPopoverRef = await this.open(ConfirmPopoverComponent, () => resolve(false));
            const confirmPopover = confirmPopoverRef.instance;
            confirmPopover.title.set(title);
            confirmPopover.message.set(message);
            confirmPopover.confirmText.set(confirm);
            confirmPopover.cancelText.set(cancelText);
            confirmPopover.callback = async (confirmed: boolean) => {
                resolve(confirmed);
                await this.close();
            };
        });
    }
}

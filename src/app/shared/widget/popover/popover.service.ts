import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, signal, Type } from "@angular/core";
import { PopoverComponent } from "./popover";
import { xcomputed } from "../../utils/signal-utils";

@Injectable({
    providedIn: 'root',
})
export class PopoverService {

    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(EnvironmentInjector);

    private readonly hostRef = signal<ComponentRef<PopoverComponent> | null>(null);
    readonly isOpen = xcomputed([this.hostRef], hostRef => hostRef !== null);

    async open<T>(component: Type<T>): Promise<ComponentRef<T>> {
        await this.close();
        const hostRef = createComponent(PopoverComponent, { environmentInjector: this.injector });
        document.body.appendChild(hostRef.location.nativeElement);
        this.appRef.attachView(hostRef.hostView);
        hostRef.instance.onClose.subscribe(() => this.close());
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
}

import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, signal, Type } from "@angular/core";
import { PopoverHostComponent } from "./popover-host";

@Injectable({
    providedIn: 'root',
})
export class PopoverService {

    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(EnvironmentInjector);

    private hostRef: ComponentRef<PopoverHostComponent> | null = null;
    private readonly _isOpen = signal(false);
    readonly isOpen = this._isOpen.asReadonly();

    open<T>(component: Type<T>): ComponentRef<T> {
        this.close();
        if (!this.hostRef) {
            this.hostRef = createComponent(PopoverHostComponent, {
                environmentInjector: this.injector,
            });
            document.body.appendChild(this.hostRef.location.nativeElement);
            this.appRef.attachView(this.hostRef.hostView);
            this.hostRef.instance.onClose.subscribe(() => this.close());
        }
        const contentRef = this.hostRef.instance.loadComponent(component, this.injector);
        this._isOpen.set(true);

        return contentRef;
    }

    close() {
        if (!this.hostRef) return;
        this.hostRef.instance.clear();
        this._isOpen.set(false);
    }

    destroy() {
        if (!this.hostRef) return;
        this.appRef.detachView(this.hostRef.hostView);
        this.hostRef.destroy();
        this.hostRef = null;
        this._isOpen.set(false);
    }
}

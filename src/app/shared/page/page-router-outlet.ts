import { ComponentRef, Directive, EnvironmentInjector, Injector, Signal, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, ChildrenOutletContexts, ROUTER_OUTLET_DATA, RouterOutlet } from '@angular/router';
import { PageComponent } from './page';

@Directive({ selector: 'app-page-router-outlet' })
export class PageRouterOutlet extends RouterOutlet {

    override async activateWith(activatedRoute: ActivatedRoute, environmentInjector: EnvironmentInjector) {
        const currentComponent = this['activated'] as ComponentRef<PageComponent> | null;
        const location = this['location'] as ViewContainerRef;
        const snapshot = activatedRoute.snapshot;
        const component = snapshot.component!;
        const childContexts = this['parentContexts'].getOrCreateContext(this.name).children;
        const injector = new OutletInjector(
            activatedRoute,
            childContexts,
            location.injector,
            this.routerOutletData,
        );
        const componentRef = location.createComponent(component, {
            index: location.length,
            injector,
            environmentInjector: environmentInjector,
        });
        this.attach(componentRef, activatedRoute);
        componentRef.instance.el.classList.add('router-page', 'enter');
        if (currentComponent) {
            currentComponent.instance.el.classList.remove('enter');
            currentComponent.instance.el.classList.add('leave');
            setTimeout(() => {
                location.detach(location.indexOf(currentComponent.hostView));
                currentComponent.destroy();
                this.detachEvents.emit(currentComponent.instance);
            }, 100);
        }
    }

    
    override deactivate(): void {}
}

class OutletInjector implements Injector {
    constructor(
        private route: ActivatedRoute,
        private childContexts: ChildrenOutletContexts,
        private parent: Injector,
        private outletData: Signal<unknown>,
    ) {}

    get(token: any, notFoundValue?: any): any {
        if (token === ActivatedRoute) {
            return this.route;
        }

        if (token === ChildrenOutletContexts) {
            return this.childContexts;
        }

        if (token === ROUTER_OUTLET_DATA) {
            return this.outletData;
        }

        return this.parent.get(token, notFoundValue);
    }
}

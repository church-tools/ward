import { ComponentRef, Directive, EnvironmentInjector, Injector, Signal, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, ChildrenOutletContexts, ROUTER_OUTLET_DATA, RouterOutlet } from '@angular/router';
import { PageComponent } from './page';

@Directive({ selector: 'app-page-router-outlet' })
export class PageRouterOutlet extends RouterOutlet {

    private path: string | null = null;

    override async activateWith(activatedRoute: ActivatedRoute, environmentInjector: EnvironmentInjector) {
        const previousPath = this.path;
        this.path = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
        const currentComponent = this['activated'] as ComponentRef<PageComponent> | null;
        const location = this['location'] as ViewContainerRef;
        const childContexts = this['parentContexts'].getOrCreateContext(this.name).children;
        const componentRef = location.createComponent(activatedRoute.snapshot.component!, {
            index: location.length,
            injector: new OutletInjector(activatedRoute, childContexts, location.injector, this.routerOutletData),
            environmentInjector
        });
        this.attach(componentRef, activatedRoute);
        const animation = this.getAnimationClass(previousPath, this.path);
        componentRef.instance.el.classList.add('router-page', 'enter', animation);
        if (currentComponent) {
            currentComponent.instance.el.classList.remove('enter', 'fade', 'left', 'right');
            currentComponent.instance.el.classList.add('leave', animation);
            setTimeout(() => {
                location.detach(location.indexOf(currentComponent.hostView));
                currentComponent.destroy();
                this.detachEvents.emit(currentComponent.instance);
            }, 500);
        }
    }

    override deactivate(): void {} // No-op to prevent deactivation logic

    private getAnimationClass(fromPath: string | null, toPath: string | null): string {
        if (!fromPath || !toPath)
            return 'fade';
        if (toPath.startsWith(fromPath))
            return 'left';
        if (fromPath.startsWith(toPath))
            return 'right';
        return 'fade';
    }
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

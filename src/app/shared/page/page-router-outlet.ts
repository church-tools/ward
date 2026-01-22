import { ComponentRef, Directive, EnvironmentInjector, Injector, Signal, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, ChildrenOutletContexts, ROUTER_OUTLET_DATA, RouterOutlet } from '@angular/router';
import { animationDurationLgMs } from '../utils/style';
import { PageComponent } from './page';

@Directive({ selector: 'app-page-router-outlet' })
export class PageRouterOutlet extends RouterOutlet {
    
    private path: string | null = null;

    override activateWith(activatedRoute: ActivatedRoute, environmentInjector: EnvironmentInjector) {
        const previousPath = this.path;
        this.path = activatedRoute.snapshot.url.map(segment => segment.path).join('/');
        const oldPageRef = this['activated'] as ComponentRef<PageComponent> | null;
        const location = this['location'] as ViewContainerRef;
        const newPageRef = location.createComponent(activatedRoute.snapshot.component!, {
            index: location.length,
            injector: new OutletInjector(activatedRoute,
                this['parentContexts'].getOrCreateContext(this.name).children,
                location.injector, this.routerOutletData),
            environmentInjector
        });
        this.attach(newPageRef, activatedRoute);
        const animation = this.getAnimationClass(previousPath, this.path);
        const newPage = newPageRef.instance;
        newPage.el.classList.add('page-router-child', 'page-transitioning', 'enter', animation);
        const oldPage = oldPageRef?.instance;
        oldPage?.el.classList.remove('enter', 'fade', 'left', 'right');
        oldPage?.el.classList.add('page-router-child', 'page-transitioning', 'leave', animation);
        oldPage?.onLeaving();
        setTimeout(() => {
            newPage.el.classList.remove('page-transitioning', 'enter', animation);
            if (oldPageRef) {
                location.detach(location.indexOf(oldPageRef.hostView));
                oldPageRef.destroy();
                this.detachEvents.emit(oldPageRef.instance);
            }
        }, animationDurationLgMs);
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
        switch (token) {
            case ActivatedRoute: return this.route;
            case ChildrenOutletContexts: return this.childContexts;
            case ROUTER_OUTLET_DATA: return this.outletData;
            default: return this.parent.get(token, notFoundValue);
        }
    }
}

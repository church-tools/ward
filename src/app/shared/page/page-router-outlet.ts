import { Directive, ElementRef, EnvironmentInjector } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { PageComponent } from './page';
import { wait } from '../utils/flow-control-utils';

@Directive({ selector: 'app-page-router-outlet' })
export class PageRouterOutlet extends RouterOutlet {

    override async activateWith(activatedRoute: ActivatedRoute, environmentInjector: EnvironmentInjector) {
        const prevPage = this.component as PageComponent;
        if (prevPage) {
            prevPage.el.classList.add('leave');
            await wait(200);
        }
        super.activateWith(activatedRoute, environmentInjector);
        const page = this.component as PageComponent;
        page.el.classList.add('router-page', 'enter');
        setTimeout(() => page.el.classList.remove('enter'), 300);
    }

    // override deactivate(): void {
    //     // hold off on super.deactivate() until you choose
    //     const page = this.component as PageComponent;
    //     page?.el.classList.add('leave');
    //     setTimeout(() => super.deactivate(), 500);
    // }
}
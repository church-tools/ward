import { Component, inject, OnDestroy, signal } from '@angular/core';
import { PageComponent } from '../../shared/page/page';
import { WindowService } from '../../shared/service/window.service';
import { AdminService } from './admin.service';

@Component({
    selector: 'app-private-page',
    template: ``,
    host: {
        class: "column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class PrivatePageComponent extends PageComponent implements OnDestroy {
    
    protected readonly adminService = inject(AdminService);
    protected readonly windowService = inject(WindowService);
    protected readonly abortController = new AbortController();
    
    protected readonly show = signal<boolean>(true);

    ngOnDestroy() {
        this.abortController.abort();
    }

}
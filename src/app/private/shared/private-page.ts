import { Component, inject, OnDestroy } from '@angular/core';
import { PageComponent } from '../../shared/page/page';
import { WindowService } from '../../shared/service/window.service';
import { PopoverService } from '../../shared/widget/popover/popover.service';
import { AdminService } from './admin.service';

@Component({
    selector: 'app-private-page',
    template: ``,
})
export abstract class PrivatePageComponent extends PageComponent implements OnDestroy {
    
    protected readonly adminService = inject(AdminService);
    protected readonly windowService = inject(WindowService);
    protected readonly abortController = new AbortController();
    protected readonly popoverService = inject(PopoverService);

    ngOnDestroy() {
        this.abortController.abort();
        this.popoverService.close();
    }

    public override onLeaving() {
        this.popoverService.close();
    }
}
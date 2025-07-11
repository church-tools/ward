import { Component, inject, signal } from '@angular/core';
import { PageComponent } from '../../shared/page/page';
import { AdminService } from './admin.service';

@Component({
    selector: 'app-private-page',
    template: ``,
    host: {
        class: "column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class PrivatePageComponent extends PageComponent {
    
    protected readonly adminService = inject(AdminService);
    
    protected readonly show = signal<boolean>(true);
}
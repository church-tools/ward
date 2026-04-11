import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './shared/service/language.service';
import { ServiceWorkerService } from './shared/service/service-worker.service';
import { PopoverService } from './shared/widget/popover/popover.service';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class App {

    private readonly language = inject(LanguageService);
    private readonly serviceWorker = inject(ServiceWorkerService);
    private readonly popover = inject(PopoverService);
    
    constructor() {
        this.language.restoreFromStorage();

        this.serviceWorker.updateAvailable$.subscribe(() => {
            const ns = 'SERVICE_WORKER.UPDATE_AVAILABLE';
            this.popover
                .confirm(`${ns}.TITLE`, `${ns}.MESSAGE`, `${ns}.CONFIRM`, `${ns}.CANCEL`)
                .then(confirmed => (confirmed ? window.location.reload() : null));
        });

        this.serviceWorker.unrecoverable$.subscribe(() => {
            const ns = 'SERVICE_WORKER.ERROR_REFRESH';
            this.popover
                .confirm(`${ns}.TITLE`, `${ns}.MESSAGE`, `${ns}.CONFIRM`, `${ns}.CANCEL`)
                .then(confirmed => (confirmed ? window.location.reload() : null));
        });
    }
}

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ServiceWorkerService } from './shared/service/service-worker.service';
import { trimPastedStrings } from './shared/utils/clipboard-utils';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: '<router-outlet/>',
})
export class AppComponent {

    private readonly translate = inject(TranslateService);
    private readonly serviceWorkerService = inject(ServiceWorkerService);
    
    constructor() {
        this.translate.setDefaultLang('en');
        this.translate.use("en");

        trimPastedStrings();
    }
}

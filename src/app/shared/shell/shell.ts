import { AfterViewInit, Component, inject } from '@angular/core';
import WindowService from '../window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused()',
        '[class.narrow]': 'windowService.isSmall()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly windowService = inject(WindowService);

    ngAfterViewInit() {
        window.dispatchEvent(new CustomEvent('view-initialized'));
    }
}
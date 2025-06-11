import { AfterViewInit, Component, inject } from '@angular/core';
import WindowService from '../window.service';

@Component({
    selector: 'app-shell',
    template: '',
    host: {
        '[class.focused]': 'windowService.focused()',
    }
})
export abstract class ShellComponent implements AfterViewInit {

    protected readonly windowService = inject(WindowService);

}